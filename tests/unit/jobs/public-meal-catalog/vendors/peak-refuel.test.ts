import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/peak-refuel";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/peak-refuel-products.json";

const products = fixture.products as ShopifyProduct[];

function findProduct(title: string): ShopifyProduct {
  const product = products.find((p) => p.title === title);
  if (!product) throw new Error(`Fixture missing product: ${title}`);
  return product;
}

describe("parseCalories", () => {
  it("parses the standard 'Calories per Pouch' bullet", () => {
    expect(parseCalories("Some text. Calories per Pouch - 760. More text.")).toBe(
      760,
    );
  });

  it("handles an en dash separator", () => {
    expect(parseCalories("Calories per Pouch – 1120")).toBe(1120);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("Calories per Pouch - 1,120")).toBe(1120);
  });

  it("does not match a bundle's aggregate 'Total Calories' phrasing", () => {
    expect(parseCalories("Total Calories - 7,370")).toBeNull();
  });

  it("returns null when the phrase is absent", () => {
    expect(parseCalories("A tasty meal with no nutrition facts listed.")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("prefers the oz-in-parentheses form when present", () => {
    expect(parseWaterMl("Carefully add 2 cups (16 oz) boiling water to pouch.")).toBe(
      Math.round(16 * 29.5735),
    );
  });

  it("handles 'of boiling water' after the parenthetical", () => {
    expect(
      parseWaterMl("Carefully add 1 1/3 cups (10.5 oz) of boiling water to pouch."),
    ).toBe(Math.round(10.5 * 29.5735));
  });

  it("falls back to a plain fraction cup quantity with no oz given", () => {
    expect(parseWaterMl("just add 2/3 cups of water and restore your energy")).toBe(
      Math.round((2 / 3) * 236.588),
    );
  });

  it("falls back to a unicode vulgar fraction cup quantity", () => {
    expect(
      parseWaterMl("Just add 1 ⅓ cups of boiling water and you're set!"),
    ).toBe(Math.round((1 + 1 / 3) * 236.588));
  });

  it("falls back to a mixed-number cup quantity", () => {
    expect(
      parseWaterMl("just add 1 1/4 cups of water and restore your energy"),
    ).toBe(Math.round(1.25 * 236.588));
  });

  it("returns null when no water instructions are present", () => {
    expect(parseWaterMl("No water needed, just tear and eat.")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("parses the standard 'Net Weight' bullet", () => {
    expect(parseDryWeightGrams("Net Weight – 4.94 oz")).toBe(
      Math.round(4.94 * 28.3495),
    );
  });

  it("returns null when the bullet is absent", () => {
    expect(parseDryWeightGrams("Protein - 41g per pouch")).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal Meals-type product", () => {
    expect(shouldSkip(findProduct("White Chicken Chili"))).toBe(false);
  });

  it("includes a Dessert-type product", () => {
    expect(shouldSkip(findProduct("Strawberry Cheesecake Bites"))).toBe(false);
  });

  it("skips a Packs-type bundle", () => {
    expect(shouldSkip(findProduct("Anniversary Pack"))).toBe(true);
  });

  it("skips a Purchased Finished Goods product", () => {
    expect(shouldSkip(findProduct("Titanium Spork"))).toBe(true);
  });

  it("skips a product with a blank product_type", () => {
    expect(shouldSkip(findProduct("Stone Hat"))).toBe(true);
  });

  it("skips a Meals-typed product carrying bundle/packs tags", () => {
    // "Backcountry Pack" is mistagged product_type: Meals on the live site --
    // tags are the only signal that catches it.
    expect(shouldSkip(findProduct("Backcountry Pack"))).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("White Chicken Chili"));

    expect(result).toEqual({
      sourceVendor: "peak_refuel",
      sourceProductId: "9002665345269",
      sourceUrl: "https://peakrefuel.com/products/white-chicken-chili",
      name: "White Chicken Chili",
      brand: "Peak Refuel",
      calories: 760,
      waterMl: Math.round(8 * 29.5735),
      dryWeightGrams: Math.round(4.94 * 28.3495),
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0083/7363/3084/files/White_Chicken_Chili-V5_Front.png?v=1783951710",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // Anniversary Pack's vendor field is "Fast Bundle" -- confirmed live --
    // but every product this scraper produces is Peak Refuel by construction.
    const result = parseProduct(findProduct("Anniversary Pack"));
    expect(result.brand).toBe("Peak Refuel");
  });

  it("comes back with null fields rather than throwing when data is missing", () => {
    const result = parseProduct(findProduct("Trail Tacos"));
    expect(result.dryWeightGrams).toBeNull();
    expect(result.imageUrl).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("stops paging once a page returns fewer than the page size", async () => {
    const page1 = Array.from({ length: 250 }, (_, i) => ({ id: i }));
    const page2 = Array.from({ length: 10 }, (_, i) => ({ id: 250 + i }));
    const fetchImpl = mock(async (url: string) => {
      const page = url.includes("page=2") ? page2 : page1;
      return new Response(JSON.stringify({ products: page }));
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result).toHaveLength(260);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws when the vendor responds with a non-OK status", async () => {
    const fetchImpl = mock(
      async () => new Response("error", { status: 500 }),
    );

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });
});
