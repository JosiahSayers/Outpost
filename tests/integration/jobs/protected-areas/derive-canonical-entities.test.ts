import { deriveCanonicalEntities } from "$/jobs/workers/protected-areas/derive-canonical-entities";
import { db } from "$/utils/db";
import { describe, expect, it } from "bun:test";
import type { ProtectedAreaCategory } from "../../../../generated/prisma/enums";

interface ProtectedAreaOverrides {
  sourceUniqueId: string;
  unitName?: string;
  category?: ProtectedAreaCategory;
  publicAccess?: string | null;
  designationType?: string | null;
  managerType?: string | null;
  acres?: number | null;
  wdpaCode?: string | null;
  state?: string | null;
}

function makeProtectedArea(overrides: ProtectedAreaOverrides) {
  return db.protectedArea.create({
    data: {
      unitName: "Derive Test Area",
      category: "designation",
      aggregatorSource: "PADUS4_1",
      ...overrides,
    },
  });
}

describe("deriveCanonicalEntities", () => {
  it("collapses rows with the same normalized name + state into one Place", async () => {
    // Same physical unit across PAD-US feature classes -> one Place, three OIDs.
    // The easement row also has messy whitespace, exercising normalization.
    await makeProtectedArea({
      sourceUniqueId: "pr-fee",
      unitName: "Pictured Rocks National Lakeshore",
      state: "MI",
      category: "fee",
      publicAccess: "OA",
    });
    await makeProtectedArea({
      sourceUniqueId: "pr-proc",
      unitName: "Pictured Rocks National Lakeshore",
      state: "MI",
      category: "proclamation",
      publicAccess: "UK",
    });
    await makeProtectedArea({
      sourceUniqueId: "pr-ease",
      unitName: "  Pictured Rocks   National Lakeshore ",
      state: "MI",
      category: "easement",
      publicAccess: "XA",
    });
    // Different name sharing the stem, different state -> its own Place.
    await makeProtectedArea({
      sourceUniqueId: "pr-county",
      unitName: "Pictured Rocks County Park",
      state: "IA",
      category: "fee",
      publicAccess: "OA",
    });

    await deriveCanonicalEntities();

    const lakeshore = await db.place.findMany({
      where: { name: "Pictured Rocks National Lakeshore", state: "MI" },
      include: { sourceIds: true },
    });
    expect(lakeshore).toHaveLength(1);
    const oids = lakeshore[0]!.sourceIds
      .filter((s) => s.idType === "PADUS_OBJECTID")
      .map((s) => s.idValue)
      .sort();
    expect(oids).toEqual(["pr-ease", "pr-fee", "pr-proc"]);

    const county = await db.place.findMany({
      where: { name: "Pictured Rocks County Park" },
    });
    expect(county).toHaveLength(1);
  });

  it("stores the most-permissive publicAccess across the group, as a word (OA>RA>UK>XA)", async () => {
    await makeProtectedArea({
      sourceUniqueId: "acc-closed",
      unitName: "Access Test Area",
      state: "MT",
      publicAccess: "XA",
    });
    await makeProtectedArea({
      sourceUniqueId: "acc-open",
      unitName: "Access Test Area",
      state: "MT",
      publicAccess: "OA",
    });
    await makeProtectedArea({
      sourceUniqueId: "acc-unknown",
      unitName: "Access Test Area",
      state: "MT",
      publicAccess: "UK",
    });

    await deriveCanonicalEntities();

    const place = await db.place.findFirstOrThrow({
      where: { name: "Access Test Area", state: "MT" },
    });
    expect(place.publicAccess).toBe("Open");
  });

  it("stores the best backpacking tier and largest acreage across the group", async () => {
    // Federal fee land (tier 3) plus a private easement (tier 0) for the same
    // unit -> the Place inherits the best tier and the biggest footprint.
    await makeProtectedArea({
      sourceUniqueId: "tier-fed",
      unitName: "Tiered National Forest",
      state: "ID",
      category: "fee",
      managerType: "FED",
      publicAccess: "OA",
      acres: 500000,
    });
    await makeProtectedArea({
      sourceUniqueId: "tier-ease",
      unitName: "Tiered National Forest",
      state: "ID",
      category: "easement",
      managerType: "NGO",
      publicAccess: "XA",
      acres: 10,
    });

    await deriveCanonicalEntities();

    const place = await db.place.findFirstOrThrow({
      where: { name: "Tiered National Forest", state: "ID" },
    });
    expect(place.backpackingTier).toBe(3);
    expect(place.acres).toBe(500000);
  });

  it("demotes closed access, private parks, and private/NGO easements to tier 0", async () => {
    await makeProtectedArea({
      sourceUniqueId: "demote-fairground",
      unitName: "Countyville Fairgrounds",
      state: "MI",
      category: "fee",
      designationType: "PPRK",
      managerType: "PVT",
      publicAccess: "RA",
      acres: 30,
    });
    await makeProtectedArea({
      sourceUniqueId: "demote-easement",
      unitName: "Riverbend Conservation Easement",
      state: "MI",
      category: "easement",
      managerType: "NGO",
      publicAccess: "OA",
      acres: 200,
    });
    await makeProtectedArea({
      sourceUniqueId: "demote-closed",
      unitName: "Closed Federal Tract",
      state: "MI",
      category: "fee",
      managerType: "FED",
      publicAccess: "XA",
      acres: 5000,
    });

    await deriveCanonicalEntities();

    const tiers = Object.fromEntries(
      (
        await db.place.findMany({
          where: { state: "MI" },
          select: { name: true, backpackingTier: true },
        })
      ).map((p) => [p.name, p.backpackingTier]),
    );
    expect(tiers["Countyville Fairgrounds"]).toBe(0);
    expect(tiers["Riverbend Conservation Easement"]).toBe(0);
    expect(tiers["Closed Federal Tract"]).toBe(0);
  });

  it("links each PADUS_OBJECTID crosswalk row to its source record via the relation", async () => {
    const pa = await makeProtectedArea({
      sourceUniqueId: "rel-1",
      unitName: "Relation Area",
      state: "CO",
      category: "fee",
    });

    await deriveCanonicalEntities();

    const crosswalk = await db.placeSourceId.findUniqueOrThrow({
      where: {
        idType_idValue: { idType: "PADUS_OBJECTID", idValue: "rel-1" },
      },
      include: { protectedArea: true },
    });
    expect(crosswalk.protectedAreaId).toBe(pa.id);
    expect(crosswalk.protectedArea?.category).toBe("fee");
  });

  it("adds WDPA_Cd crosswalks for real codes only (not 0/empty)", async () => {
    await makeProtectedArea({
      sourceUniqueId: "w-real",
      unitName: "Wdpa Area",
      state: "AK",
      wdpaCode: "12345",
    });
    await makeProtectedArea({
      sourceUniqueId: "w-sentinel",
      unitName: "Wdpa Area",
      state: "AK",
      wdpaCode: "0",
    });

    await deriveCanonicalEntities();

    const place = await db.place.findFirstOrThrow({
      where: { name: "Wdpa Area", state: "AK" },
      include: { sourceIds: true },
    });
    const wdpa = place.sourceIds
      .filter((s) => s.idType === "WDPA_Cd")
      .map((s) => s.idValue);
    expect(wdpa).toEqual(["12345"]);
  });

  it("is idempotent across repeated runs", async () => {
    await makeProtectedArea({
      sourceUniqueId: "idem-1",
      unitName: "Idempotent Area",
      state: "OR",
      wdpaCode: "999",
    });
    await makeProtectedArea({
      sourceUniqueId: "idem-2",
      unitName: "Idempotent Area",
      state: "OR",
    });

    await deriveCanonicalEntities();
    const placeCount = await db.place.count();
    const crosswalkCount = await db.placeSourceId.count();

    const second = await deriveCanonicalEntities();
    expect(second.created).toBe(0);
    expect(await db.place.count()).toBe(placeCount);
    expect(await db.placeSourceId.count()).toBe(crosswalkCount);
  });

  it("re-syncs an updated group and attaches newly-ingested OIDs to the existing Place", async () => {
    const pa = await makeProtectedArea({
      sourceUniqueId: "sync-1",
      unitName: "Sync Area",
      state: "NV",
      publicAccess: "XA",
    });
    await deriveCanonicalEntities();

    const place = await db.place.findFirstOrThrow({
      where: { name: "Sync Area", state: "NV" },
    });
    expect(place.publicAccess).toBe("Closed");

    // Simulate a re-ingest: the existing row becomes more permissive, and a
    // brand-new OID lands in the same name+state group.
    await db.protectedArea.update({
      where: { id: pa.id },
      data: { publicAccess: "OA" },
    });
    await makeProtectedArea({
      sourceUniqueId: "sync-2",
      unitName: "Sync Area",
      state: "NV",
      publicAccess: "RA",
    });

    const result = await deriveCanonicalEntities();
    expect(result.created).toBe(0);

    const refreshed = await db.place.findUniqueOrThrow({
      where: { id: place.id },
      include: { sourceIds: true },
    });
    expect(refreshed.publicAccess).toBe("Open");
    const oids = refreshed.sourceIds
      .filter((s) => s.idType === "PADUS_OBJECTID")
      .map((s) => s.idValue)
      .sort();
    expect(oids).toEqual(["sync-1", "sync-2"]);
    expect(
      await db.place.count({ where: { name: "Sync Area", state: "NV" } }),
    ).toBe(1);
  });
});
