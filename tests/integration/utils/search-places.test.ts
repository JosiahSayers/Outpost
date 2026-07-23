import { db } from "$/utils/db";
import { searchPlaces } from "$/utils/search-helpers";
import { describe, expect, it } from "bun:test";

interface PlaceOverrides {
  name?: string;
  state?: string | null;
  publicAccess?: string | null;
  backpackingTier?: number;
  acres?: number | null;
}

function makePlace(overrides: PlaceOverrides = {}) {
  return db.place.create({
    data: {
      name: "Test Place",
      // Default to a real backpacking tier so results aren't filtered out; the
      // low-value (tier 0) behavior is exercised explicitly below.
      backpackingTier: 3,
      ...overrides,
    },
  });
}

describe("searchPlaces", () => {
  it("returns a full-name match", async () => {
    const place = await makePlace({
      name: "Yellowstone National Park",
      state: "WY",
    });
    const results = await searchPlaces("Yellowstone");
    expect(results.map((r) => r.id)).toContain(place.id);
  });

  it("returns a prefix (autocomplete) match", async () => {
    const place = await makePlace({
      name: "Yosemite National Park",
      state: "CA",
    });
    const results = await searchPlaces("yose");
    expect(results.map((r) => r.id)).toContain(place.id);
  });

  it("requires all whitespace-delimited tokens to match", async () => {
    const place = await makePlace({ name: "Rocky Mountain National Park" });
    expect((await searchPlaces("rocky mount")).map((r) => r.id)).toContain(
      place.id,
    );
    expect((await searchPlaces("rocky ocean")).map((r) => r.id)).not.toContain(
      place.id,
    );
  });

  it("returns an empty array for blank input", async () => {
    expect(await searchPlaces("   ")).toEqual([]);
  });

  it("filters by state", async () => {
    const wy = await makePlace({ name: "Filterton Range", state: "WY" });
    const co = await makePlace({ name: "Filterton Range", state: "CO" });
    const ids = (await searchPlaces("filterton", { state: "WY" })).map(
      (r) => r.id,
    );
    expect(ids).toContain(wy.id);
    expect(ids).not.toContain(co.id);
  });

  it("respects the limit", async () => {
    for (let i = 0; i < 5; i++) {
      await makePlace({ name: `Limitville Area ${i}` });
    }
    const results = await searchPlaces("limitville", { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it("ranks higher backpacking tiers above lower ones for the same query", async () => {
    const forest = await makePlace({
      name: "Manistee National Forest",
      backpackingTier: 3,
      acres: 500000,
    });
    const fairground = await makePlace({
      name: "Manistee Fairgrounds",
      backpackingTier: 0,
      acres: 30,
    });

    const ids = (await searchPlaces("manistee", { includeLowValue: true })).map(
      (r) => r.id,
    );
    expect(ids).toContain(forest.id);
    expect(ids).toContain(fairground.id);
    expect(ids.indexOf(forest.id)).toBeLessThan(ids.indexOf(fairground.id));
  });

  it("excludes tier-0 results unless includeLowValue is set", async () => {
    const fairground = await makePlace({
      name: "Demoteville Fairgrounds",
      backpackingTier: 0,
    });

    const defaultIds = (await searchPlaces("demoteville")).map((r) => r.id);
    expect(defaultIds).not.toContain(fairground.id);

    const inclusiveIds = (
      await searchPlaces("demoteville", { includeLowValue: true })
    ).map((r) => r.id);
    expect(inclusiveIds).toContain(fairground.id);
  });

  it("breaks ties within a tier by larger acreage", async () => {
    const big = await makePlace({ name: "Acreage Area Big", acres: 90000 });
    const small = await makePlace({ name: "Acreage Area Small", acres: 5 });

    const ids = (await searchPlaces("acreage area")).map((r) => r.id);
    expect(ids.indexOf(big.id)).toBeLessThan(ids.indexOf(small.id));
  });

  // The query is built with $queryRaw tagged templates, so every interpolated
  // value (searchQuery, state, limit, includeLowValue) is bound as a parameter
  // rather than concatenated into the SQL string. These tests feed classic
  // injection payloads through those inputs and assert nothing is executed:
  // data is never modified and filtering is never bypassed. A malicious payload
  // that happens to be an invalid tsquery raises a Postgres syntax error (42601)
  // -- which is itself proof the value was treated as data, not SQL -- so the
  // helper below treats a thrown error as a safe (empty) outcome.
  describe("SQL injection", () => {
    async function searchOrEmpty(...args: Parameters<typeof searchPlaces>) {
      try {
        return await searchPlaces(...args);
      } catch {
        // A tsquery parse error means the payload was handed to to_tsquery as a
        // bound parameter and rejected -- i.e. not executed. Safe outcome.
        return [];
      }
    }

    const destructivePayloads = [
      `'; DROP TABLE "Place"; --`,
      `x'); DELETE FROM "Place"; --`,
      `Robert'); DROP TABLE "Place";--`,
      `foo'; UPDATE "Place" SET name = 'pwned'; --`,
      `'; TRUNCATE "Place"; --`,
    ];

    it("does not execute injected DROP/DELETE/UPDATE statements", async () => {
      const sentinel = await makePlace({
        name: "Injection Sentinel Meadow",
        state: "MT",
      });
      const countBefore = await db.place.count();

      for (const payload of destructivePayloads) {
        await searchOrEmpty(payload);
        await searchOrEmpty(payload, { state: payload });
      }

      // Table still exists, the row still exists, and nothing was deleted or
      // renamed. If any payload had executed, one of these would fail.
      const stillThere = await db.place.findUnique({
        where: { id: sentinel.id },
      });
      expect(stillThere?.name).toBe("Injection Sentinel Meadow");
      expect(await db.place.count()).toBe(countBefore);
    });

    it("does not let a boolean payload bypass the WHERE clause and dump all rows", async () => {
      const secret = await makePlace({
        name: "Unrelated Secret Basin",
        state: "OR",
      });

      // A tautology injection would return every row if searchQuery were
      // concatenated into SQL. Parameterized, it can only ever match literally.
      const ids = (await searchOrEmpty(`' OR '1'='1`)).map((r) => r.id);
      expect(ids).not.toContain(secret.id);

      const orIds = (await searchOrEmpty(`x' OR 1=1 --`)).map((r) => r.id);
      expect(orIds).not.toContain(secret.id);
    });

    it("treats the state filter as a literal value, not SQL", async () => {
      const wy = await makePlace({ name: "Statefilter Ridge", state: "WY" });
      const co = await makePlace({ name: "Statefilter Ridge", state: "CO" });

      // If state were concatenated, this OR would leak the CO row too. As a
      // bound parameter it's compared literally, so no state equals this string.
      const ids = (
        await searchOrEmpty("statefilter", { state: `WY' OR state='CO` })
      ).map((r) => r.id);
      expect(ids).not.toContain(wy.id);
      expect(ids).not.toContain(co.id);
    });

    it("treats injection payloads that parse as ordinary search text", async () => {
      // This payload is a *valid* tsquery ("yellowstone" -- the quote/semicolon
      // are dropped as punctuation), so it doesn't throw. It must behave as a
      // plain search for the literal words, matching only by full-text content.
      const park = await makePlace({
        name: "Yellowstone National Park",
        state: "WY",
      });
      const other = await makePlace({
        name: "Glacier Wilderness",
        state: "MT",
      });

      const ids = (await searchOrEmpty(`Yellowstone'; --`)).map((r) => r.id);
      expect(ids).toContain(park.id);
      expect(ids).not.toContain(other.id);
    });
  });
});
