import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type BackpackersPantryProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/backpackers-pantry";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/backpackers-pantry/products.json";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../../../fixtures/backpackers-pantry",
);

function loadHtml(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

function findListingProduct(handle: string) {
  const product = fixture.products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

function loadProduct(
  handle: string,
  htmlFixture: string,
): BackpackersPantryProduct {
  return { ...findListingProduct(handle), html: loadHtml(htmlFixture) };
}

describe("parseCalories", () => {
  it("parses the 'Calories:' bullet", () => {
    expect(parseCalories("Calories: 760")).toBe(760);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("Calories: 1,120")).toBe(1120);
  });

  it("returns null when the bullet is absent", () => {
    expect(parseCalories("Ready-to-Eat. 3 Year Shelf Life.")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("parses the 'Weight:' bullet stated in oz", () => {
    expect(parseDryWeightGrams("Weight: 6.2 oz")).toBe(
      Math.round(6.2 * 28.3495),
    );
  });

  it("returns null when the bullet is absent", () => {
    expect(parseDryWeightGrams("Protein: 24g")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("reads the mL figure directly out of the boiling-water parenthetical", () => {
    expect(parseWaterMl("3. Add 1 3⁄4 cups (420mL) of boiling water.")).toBe(
      420,
    );
  });

  it("reads the mL figure out of a cold-water parenthetical", () => {
    expect(parseWaterMl("2. Add 2/3 cup (160mL) of cold water.")).toBe(160);
  });

  it("returns null for a no-rehydration item", () => {
    expect(parseWaterMl("Ready to eat. No re-hydration necessary.")).toBeNull();
  });

  it("returns null when the text is empty", () => {
    expect(parseWaterMl("")).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock Food item", () => {
    expect(shouldSkip(findListingProduct("pad-thai"))).toBe(false);
  });

  it("includes a Food item with no nutrition bullets of its own", () => {
    expect(shouldSkip(findListingProduct("freeze-dried-cinnamon-apples"))).toBe(
      false,
    );
  });

  it("skips a Collection_Emergency-tagged multi-day meal kit bundle", () => {
    expect(shouldSkip(findListingProduct("3-day-meal-kit-meat"))).toBe(true);
  });

  it("skips a Gift Card product type", () => {
    expect(
      shouldSkip(findListingProduct("backpackers-pantry-online-gift-card")),
    ).toBe(true);
  });

  it("skips a Gear product type", () => {
    expect(
      shouldSkip(findListingProduct("get-outside-feed-your-soul-t-shirt")),
    ).toBe(true);
  });

  it("skips a product whose only variant is unavailable", () => {
    expect(shouldSkip(findListingProduct("blueberry-peach-crisp"))).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const product = loadProduct("pad-thai", "product-pad-thai.html");
    const result = parseProduct(product);

    expect(result).toEqual({
      sourceVendor: "backpackers_pantry",
      sourceProductId: "4906838982788",
      sourceUrl: "https://backpackerspantry.com/products/pad-thai",
      name: "Pad Thai",
      brand: "Backpacker's Pantry",
      calories: 760,
      waterMl: 420,
      dryWeightGrams: Math.round(6.2 * 28.3495),
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0317/7640/7684/files/Pad.Thai.Main.jpg?v=1778192188",
    });
  });

  it("reads the Preparation & Storage panel rather than an unrelated collapsible section", () => {
    // The fixture's "Ingredients" panel has a decoy "(999mL)" figure to
    // prove the selector doesn't just grab the first match on the page.
    const product = loadProduct("pad-thai", "product-pad-thai.html");
    expect(parseProduct(product).waterMl).toBe(420);
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The live vendor field is inconsistently "Backpacker's Pantry" or the
    // internal "backpackerspantry-dev" store handle depending on the
    // product -- confirmed live -- but every product this scraper produces
    // is Backpacker's Pantry by construction.
    const product = loadProduct(
      "freeze-dried-cinnamon-apples",
      "product-freeze-dried-cinnamon-apples.html",
    );
    expect(parseProduct(product).brand).toBe("Backpacker's Pantry");
  });

  it("comes back with null fields rather than throwing when data is missing", () => {
    const product = loadProduct(
      "freeze-dried-cinnamon-apples",
      "product-freeze-dried-cinnamon-apples.html",
    );
    const result = parseProduct(product);
    expect(result.calories).toBeNull();
    expect(result.dryWeightGrams).toBeNull();
    expect(result.waterMl).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("filters by product type/tag/availability before fetching detail pages, then parses only the survivors", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.includes("/products/pad-thai")) {
        return new Response(loadHtml("product-pad-thai.html"));
      }
      if (url.includes("/products/freeze-dried-cinnamon-apples")) {
        return new Response(
          loadHtml("product-freeze-dried-cinnamon-apples.html"),
        );
      }
      throw new Error(`Unexpected fetch during test: ${url}`);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.handle).sort()).toEqual([
      "freeze-dried-cinnamon-apples",
      "pad-thai",
    ]);
    // 1 listing page (6 products < the 250 page size, so no second page) + a
    // detail-page fetch for only the 2 survivors -- the gift card, gear,
    // bundle, and out-of-stock fixture products must never trigger a
    // request.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws when products.json responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });

  it("throws when a product detail page responds with a non-OK status", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      return new Response("error", { status: 404 });
    });

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/404/);
  });
});
