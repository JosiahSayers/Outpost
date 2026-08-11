import {
  fetchProducts,
  parseDryWeightGrams,
  parseProduct,
  selectImageUrl,
  shouldSkip,
  type LuxeflyBasecampProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/luxefly-basecamp";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/luxefly-basecamp/products.json";

const products = fixture.products as LuxeflyBasecampProduct[];

function findProduct(handle: string): LuxeflyBasecampProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(parseDryWeightGrams(findProduct("chicken-marbella"))).toBe(170);
  });

  it("reads the first variant's weight for a two-size product, since both sizes record the same weight", () => {
    expect(
      parseDryWeightGrams(
        findProduct(
          "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
        ),
      ),
    ).toBe(170);
  });
});

describe("selectImageUrl", () => {
  it("uses the first image when it isn't the cooked/plated shot", () => {
    const product = findProduct("chicken-marbella");
    expect(selectImageUrl(product)).toBe(product.images[0]!.src);
  });

  it("skips a first image whose filename says it's the cooked dish", () => {
    const product = findProduct("filet-mignon-beef-stroganoff");
    expect(product.images[0]!.src).toContain("stroganoff_cooked");

    expect(selectImageUrl(product)).toBe(product.images[1]!.src);
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock meal", () => {
    expect(shouldSkip(findProduct("chicken-marbella"))).toBe(false);
  });

  it("includes a meal with individual and serves-2 size variants", () => {
    expect(
      shouldSkip(
        findProduct(
          "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
        ),
      ),
    ).toBe(false);
  });

  it("skips the digital gift card, whose variants are all non-shippable", () => {
    expect(
      shouldSkip(
        findProduct("give-the-gift-of-healthy-nutritious-anywhere-meals"),
      ),
    ).toBe(true);
  });

  it("skips the merch-tagged Titanium Fork", () => {
    expect(shouldSkip(findProduct("titanium-fork"))).toBe(true);
  });

  it("skips the multi-bag subscription product", () => {
    expect(
      shouldSkip(
        findProduct(
          "saucefly-basecamp-subscription-1x-every-30-days-3-bags-includes-a-20-discount",
        ),
      ),
    ).toBe(true);
  });

  it("skips a meal whose only variant is unavailable", () => {
    expect(
      shouldSkip(findProduct("black-and-blueberry-shortbread-cobbler")),
    ).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("chicken-marbella"));

    expect(result).toEqual({
      sourceVendor: "luxefly_basecamp",
      sourceProductId: "10010129531177",
      sourceUrl: "https://luxeflybasecamp.com/products/chicken-marbella",
      name: "Chicken Marbella",
      brand: "Luxefly Basecamp",
      calories: null,
      waterMl: null,
      dryWeightGrams: 170,
      imageUrl: findProduct("chicken-marbella").images[0]!.src,
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // Confirmed live the vendor field is inconsistently "Luxefly Basecamp"
    // vs "Luxefly Base Camp" (with a space) depending on the product.
    const result = parseProduct(findProduct("chicken-marbella"));
    expect(result.brand).toBe("Luxefly Basecamp");
  });

  it("always comes back with null calories and waterMl -- meals never state either in text", () => {
    const result = parseProduct(findProduct("chicken-marbella"));
    expect(result.calories).toBeNull();
    expect(result.waterMl).toBeNull();
  });

  it("skips the cooked/plated image in favor of the packaging shot", () => {
    const product = findProduct("filet-mignon-beef-stroganoff");
    const result = parseProduct(product);
    expect(result.imageUrl).toBe(product.images[1]!.src);
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
