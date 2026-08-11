import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
  type ItacateProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/itacate";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/itacate/products.json";

const products = fixture.products as ItacateProduct[];

function findProduct(handle: string): ItacateProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseCalories", () => {
  it("reads the figure out of the pipe-delimited nutrition line", () => {
    expect(parseCalories("Single Serving | Vegan | 490 Cal | 4.0 oz")).toBe(
      490,
    );
  });

  it("does not mistake the Prop 65 California warning for a calorie figure", () => {
    expect(
      parseCalories(
        "CALIFORNIA PROPOSITION 65 WARNING: Can expose you to arsenic",
      ),
    ).toBeNull();
  });

  it("returns null when no figure is present", () => {
    expect(parseCalories("Give the gift of delicious Latin meals!")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(parseDryWeightGrams(findProduct("campsite-lentejas"))).toBe(123);
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock meal", () => {
    expect(shouldSkip(findProduct("campsite-lentejas"))).toBe(false);
  });

  it("skips the gift card, whose product type is empty", () => {
    expect(shouldSkip(findProduct("itacate-gift-card"))).toBe(true);
  });

  it("skips a meal whose only variant is unavailable", () => {
    expect(shouldSkip(findProduct("discontinued-out-of-stock-meal"))).toBe(
      true,
    );
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("campsite-lentejas"));

    expect(result).toEqual({
      sourceVendor: "itacate",
      sourceProductId: "7301800263872",
      sourceUrl: "https://itacatefoods.com/products/campsite-lentejas",
      name: "Campsite Lentejas (Lentils)",
      brand: "Itacate Foods",
      calories: 490,
      waterMl: null,
      dryWeightGrams: 123,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0578/2385/4784/files/CampsiteLentejas_Front.jpg?v=1705607001",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    const result = parseProduct(findProduct("campsite-lentejas"));
    expect(result.brand).toBe("Itacate Foods");
  });

  it("always comes back with null waterMl -- meals never state a water quantity", () => {
    const result = parseProduct(findProduct("aventura-arroz-con-leche"));
    expect(result.waterMl).toBeNull();
    expect(result.calories).toBe(450);
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
