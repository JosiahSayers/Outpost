import {
  fetchProducts,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
  type NomadNutritionProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/nomad-nutrition";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/nomad-nutrition/products.json";

const products = fixture.products as NomadNutritionProduct[];

function findProduct(handle: string): NomadNutritionProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(parseDryWeightGrams(findProduct("caribbean-curry"))).toBe(130);
  });

  it("reads the half-serving product's own (lighter) variant weight", () => {
    expect(parseDryWeightGrams(findProduct("caribbean-curry-56g"))).toBe(70);
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock meal", () => {
    expect(shouldSkip(findProduct("caribbean-curry"))).toBe(false);
  });

  it("includes a half-serving meal -- it's its own purchasable product, not a variant", () => {
    expect(shouldSkip(findProduct("caribbean-curry-56g"))).toBe(false);
  });

  it("skips a multi-meal bundle by title", () => {
    expect(shouldSkip(findProduct("breakfast-pack"))).toBe(true);
  });

  it("skips a multi-serving bulk refill bag by title", () => {
    expect(shouldSkip(findProduct("five-meals-bulk-bag"))).toBe(true);
  });

  it("skips a Swag product type", () => {
    expect(shouldSkip(findProduct("t-shirt"))).toBe(true);
  });

  it("skips a gift card product type", () => {
    expect(shouldSkip(findProduct("nomad-nutrition-gift-card"))).toBe(true);
  });

  it("skips a product whose only variant is unavailable", () => {
    expect(shouldSkip(findProduct("discontinued-out-of-stock-meal"))).toBe(
      true,
    );
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("caribbean-curry"));

    expect(result).toEqual({
      sourceVendor: "nomad_nutrition",
      sourceProductId: "1484676431921",
      sourceUrl: "https://www.nomadnutrition.co/products/caribbean-curry",
      name: "Caribbean Curry",
      brand: "Nomad Nutrition",
      calories: null,
      waterMl: null,
      dryWeightGrams: 130,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/1406/0996/files/nomad-nutrition-food-caribbean-curry-caribbean-curry-nomad-nutrition-dehydrated-meals-cc112-plant-based-vegan-dehydrated-gluten-free-1227997569.png?v=1773909008",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The kathmandu-curry-56g product's vendor field is "NomadNutrition"
    // (no space) -- confirmed live -- but every product this scraper
    // produces is Nomad Nutrition by construction.
    const result = parseProduct(findProduct("kathmandu-curry-56g"));
    expect(result.brand).toBe("Nomad Nutrition");
  });

  it("always comes back with null calories and waterMl -- the site never states either in text", () => {
    const result = parseProduct(findProduct("protein-crumble"));
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
