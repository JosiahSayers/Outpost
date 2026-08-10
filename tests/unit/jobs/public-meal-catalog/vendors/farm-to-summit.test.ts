import {
  fetchProducts,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
  type FarmToSummitProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/farm-to-summit";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/farm-to-summit/products.json";

const products = fixture.products as FarmToSummitProduct[];

function findProduct(handle: string): FarmToSummitProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(parseDryWeightGrams(findProduct("thai-red-curry"))).toBe(190);
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock meal", () => {
    expect(shouldSkip(findProduct("thai-red-curry"))).toBe(false);
  });

  it("skips a Latte product type", () => {
    expect(shouldSkip(findProduct("oat-milk-latte"))).toBe(true);
  });

  it("skips Camp Store apparel with an empty product type", () => {
    expect(shouldSkip(findProduct("wranglin-carrots-hoodie-new"))).toBe(true);
  });

  it("skips the gift card", () => {
    expect(shouldSkip(findProduct("gift-card"))).toBe(true);
  });

  it("skips the build-your-own bundle", () => {
    expect(shouldSkip(findProduct("mix-match-meal-bundle"))).toBe(true);
  });

  it("skips a meal whose only variant is unavailable", () => {
    expect(shouldSkip(findProduct("discontinued-out-of-stock-meal"))).toBe(
      true,
    );
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("thai-red-curry"));

    expect(result).toEqual({
      sourceVendor: "farm_to_summit",
      sourceProductId: "8190993301797",
      sourceUrl: "https://farmtosummit.com/products/thai-red-curry",
      name: "Thai Red Curry",
      brand: "Farm To Summit",
      calories: null,
      waterMl: null,
      dryWeightGrams: 190,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0738/4517/8661/files/ThaiRedCurry_20720ab6-c6b6-49b5-9788-74f8ff2ef6d0.png?v=1772486624",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The gift-card product's vendor field is "My Store" -- confirmed live --
    // but every meal this scraper produces is Farm To Summit by construction.
    const result = parseProduct(findProduct("thai-red-curry"));
    expect(result.brand).toBe("Farm To Summit");
  });

  it("always comes back with null calories and waterMl -- meals never state either in text", () => {
    const result = parseProduct(findProduct("thai-red-curry"));
    expect(result.calories).toBeNull();
    expect(result.waterMl).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("stops paging once a page returns fewer than the page size", async () => {
    const fetchImpl = mock(async () => new Response(JSON.stringify(fixture)));

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result).toHaveLength(products.length);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws when products.json responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });
});
