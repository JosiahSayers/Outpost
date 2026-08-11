import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type AngryPikaProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/angry-pika";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/angry-pika/products.json";

const products = fixture.products as AngryPikaProduct[];

function findProduct(handle: string): AngryPikaProduct {
  const product = products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

describe("parseCalories", () => {
  it("parses the 'CALORIES - N' bullet", () => {
    expect(parseCalories("FUEL - keeps you moving\n\nCALORIES - 630")).toBe(
      630,
    );
  });

  it("parses the 'CALORIES - N calories per pouch!' phrasing", () => {
    expect(parseCalories("CALORIES - 640 calories per pouch!")).toBe(640);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("CALORIES - 1,120")).toBe(1120);
  });

  it("returns null when the bullet is absent", () => {
    expect(parseCalories("No nutrition figures stated here.")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("averages the 'Mix with N-Noz' range", () => {
    // Every granola meal states the same "4-5oz" range rather than a single
    // figure -- confirmed live across the whole catalog.
    expect(parseWaterMl("Mix with 4-5oz of hot or cold water")).toBe(133);
  });

  it("reads a single 'Mix with Noz' figure when no range is given", () => {
    expect(parseWaterMl("Mix with 6oz of hot water")).toBe(177);
  });

  it("returns null when no prep instructions are present", () => {
    expect(parseWaterMl("Ready to eat, no prep needed.")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(
      parseDryWeightGrams(findProduct("alpen-fuel-orange-pecan-granola")),
    ).toBe(133);
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock Meal", () => {
    expect(shouldSkip(findProduct("alpen-fuel-orange-pecan-granola"))).toBe(
      false,
    );
  });

  it("includes a normal in-stock Snack (trail cookie)", () => {
    expect(shouldSkip(findProduct("maple-pecan-trail-cookies"))).toBe(false);
  });

  it("skips a product whose only variant is unavailable", () => {
    expect(shouldSkip(findProduct("monster-trail-cookies"))).toBe(true);
  });

  it("skips a variety pack by title even though it's in stock and Meal-typed", () => {
    expect(shouldSkip(findProduct("granola-variety-pack"))).toBe(true);
  });

  it("skips a Gift Cards product type", () => {
    expect(shouldSkip(findProduct("angry-pika-gift-card"))).toBe(true);
  });

  it("skips merch, which carries an empty product_type", () => {
    expect(shouldSkip(findProduct("unisex-pika-t-shirt"))).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a granola meal", () => {
    const result = parseProduct(findProduct("alpen-fuel-orange-pecan-granola"));

    expect(result).toEqual({
      sourceVendor: "angry_pika",
      sourceProductId: "4519065813103",
      sourceUrl:
        "https://angrypikafood.com/products/alpen-fuel-orange-pecan-granola",
      name: "Orange Pecan Granola",
      brand: "Angry Pika Food Co.",
      calories: 630,
      waterMl: 133,
      dryWeightGrams: 133,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0080/2177/0351/files/Orange_Pecan_front.png?v=1767849744",
    });
  });

  it("assembles the full scraped shape for a trail cookie, hardcoding waterMl to 0", () => {
    const result = parseProduct(findProduct("maple-pecan-trail-cookies"));

    expect(result).toEqual({
      sourceVendor: "angry_pika",
      sourceProductId: "7764639449260",
      sourceUrl: "https://angrypikafood.com/products/maple-pecan-trail-cookies",
      name: "Maple Pecan Trail Cookies",
      brand: "Angry Pika Food Co.",
      calories: 640,
      waterMl: 0,
      dryWeightGrams: 128,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0080/2177/0351/files/Maple_Pecan_front.png?v=1770584603",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // maple-pecan-trail-cookies' vendor field is "Alpen Fuel", the brand's
    // former name -- confirmed live it still appears on products that
    // predate the rename to Angry Pika Food Co.
    const product = findProduct("maple-pecan-trail-cookies");
    expect(product.vendor).toBe("Alpen Fuel");

    const result = parseProduct(product);
    expect(result.brand).toBe("Angry Pika Food Co.");
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
