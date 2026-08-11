import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type GoodToGoProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/good-to-go";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/good-to-go/products.json";

const products = fixture.products as GoodToGoProduct[];

function findProduct(handle: string): GoodToGoProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseCalories", () => {
  it("parses the 'N calories' phrasing", () => {
    expect(parseCalories("With 490 calories and 16g of protein")).toBe(490);
  });

  it("parses the 'N cals per serving' phrasing", () => {
    expect(parseCalories("580 cals per serving, our highest yet")).toBe(580);
  });

  it("takes the single-serving figure over a later double-serving one", () => {
    expect(
      parseCalories(
        "540 cals per serving and a whopping 1,070 cals in an entire double serving",
      ),
    ).toBe(540);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("1,070 cals in an entire double serving")).toBe(1070);
  });

  it("does not match the 'calorie-dense' adjective with no number", () => {
    expect(parseCalories("a delicious calorie-dense, vegan option")).toBeNull();
  });

  it("returns null when no figure is stated", () => {
    expect(parseCalories("Just add water and enjoy.")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("reads the mL figure out of the rehydration step's parenthetical", () => {
    expect(
      parseWaterMl(
        "Add a little more than one cup (250ML) of BOILING water to bag.",
      ),
    ).toBe(250);
  });

  it("returns null when no water instructions are present", () => {
    expect(parseWaterMl("Tear open and eat, no water needed.")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the 'Each' variant's shipping weight", () => {
    expect(parseDryWeightGrams(findProduct("pad-thai"))).toBe(135);
  });

  it("returns null when there's no 'Each' variant", () => {
    // pasta-marinara-cup's only variant is an "8-Pack" -- confirmed live,
    // an out-of-stock legacy SKU that's still imported (out-of-stock no
    // longer filters a product out), so the parse function itself needs to
    // degrade to null rather than picking the pack's weight.
    expect(parseDryWeightGrams(findProduct("pasta-marinara-cup"))).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock Entree", () => {
    expect(shouldSkip(findProduct("cuban-rice-bowl"))).toBe(false);
  });

  it("includes a normal in-stock Cup-v2", () => {
    expect(shouldSkip(findProduct("chicken-pho-cup"))).toBe(false);
  });

  it("skips a Food Kit bundle", () => {
    expect(shouldSkip(findProduct("the-thru-hiker-food-kit-1"))).toBe(true);
  });

  it("skips a Gift Cards product type", () => {
    expect(shouldSkip(findProduct("gift-card"))).toBe(true);
  });

  it("skips a variety pack by title even though it's in stock and Cup-typed", () => {
    expect(shouldSkip(findProduct("variety-6-pack-of-cups"))).toBe(true);
  });

  it("includes a product whose only variant is out of stock, since a user may already own it or source it elsewhere", () => {
    expect(shouldSkip(findProduct("pasta-marinara-cup"))).toBe(false);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(findProduct("cuban-rice-bowl"));

    expect(result).toEqual({
      sourceVendor: "good_to_go",
      sourceProductId: "5658867400853",
      sourceUrl: "https://goodto-go.com/products/cuban-rice-bowl",
      name: "Cuban Rice Bowl",
      brand: "Good To-Go",
      calories: 540,
      waterMl: 275,
      dryWeightGrams: 140,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/1658/5791/products/GTG_CubanBowl_Single_Front_S22.png?v=1738958982",
    });
  });

  it("comes back with a null calories field rather than throwing when the copy states no figure", () => {
    // Confirmed live: calories only appear as text when a product's FAQ
    // copy happens to call it out -- most products' copy never does, since
    // the real figure is only ever baked into the nutrition-label image.
    const result = parseProduct(findProduct("pad-thai"));
    expect(result.calories).toBeNull();
    expect(result.waterMl).toBe(250);
    expect(result.dryWeightGrams).toBe(135);
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The gift-card product's vendor field is "Good to Go D2c" -- confirmed
    // live -- but every product this scraper produces is Good To-Go by
    // construction.
    const result = parseProduct(findProduct("gift-card"));
    expect(result.brand).toBe("Good To-Go");
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
