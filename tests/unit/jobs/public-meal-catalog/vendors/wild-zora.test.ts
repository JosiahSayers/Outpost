import {
  fetchProducts,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
} from "$/jobs/workers/public-meal-catalog/vendors/wild-zora";
import type { ShopifyProduct } from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import { describe, expect, it, mock } from "bun:test";
import fixture from "../../../../fixtures/wild-zora-products.json";

const products = fixture.products as ShopifyProduct[];

function findProduct(title: string): ShopifyProduct {
  const product = products.find((p) => p.title === title);
  if (!product) throw new Error(`Fixture missing product: ${title}`);
  return product;
}

describe("parseDryWeightGrams", () => {
  it("parses the standard 'Net dry weight' phrasing", () => {
    expect(parseDryWeightGrams("Net dry weight 3oz/85g.")).toBe(85);
  });

  it("parses the 'Net weight' phrasing with no 'dry'", () => {
    expect(
      parseDryWeightGrams("Net weight 3oz/85g and 12-month shelf-life."),
    ).toBe(85);
  });

  it("parses the reversed Quinoa Meals phrasing", () => {
    expect(
      parseDryWeightGrams("3oz/86g dry weight, plus 10g olive oil packet."),
    ).toBe(86);
  });

  it("ignores the olive oil packet's own gram figure", () => {
    expect(
      parseDryWeightGrams("3oz/86g dry weight, plus 10g olive oil packet."),
    ).not.toBe(10);
  });

  it("returns null when the phrase is absent", () => {
    expect(
      parseDryWeightGrams("A hearty turkey meal for the trail."),
    ).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal single-serve meal", () => {
    expect(shouldSkip(findProduct("Meals To Go - Summit Savory Chicken"))).toBe(
      false,
    );
  });

  it("includes a Quinoa Meals product", () => {
    expect(
      shouldSkip(
        findProduct(
          "Quinoa Meals – Herb Roasted Chicken with Spinach, Carrots & Herbs",
        ),
      ),
    ).toBe(false);
  });

  it("skips a multipack bundle", () => {
    expect(shouldSkip(findProduct("AIP Meals 4-Pack"))).toBe(true);
  });

  it("skips a multipack bundle even when mistagged with vendor PMTG", () => {
    // Confirmed live: this bundle's own `vendor` field reads "PMTG" rather
    // than "Wild Zora" -- the multipack tag is what actually excludes it.
    expect(shouldSkip(findProduct("Meals To Go - Savory Variety 4-Pack"))).toBe(
      true,
    );
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(
      findProduct("Meals To Go - Summit Savory Chicken"),
    );

    expect(result).toEqual({
      sourceVendor: "wild_zora",
      sourceProductId: "780828180571",
      sourceUrl:
        "https://wildzora.com/products/wild-zora-summit-savory-chicken-3-oz",
      name: "Meals To Go - Summit Savory Chicken",
      brand: "Wild Zora",
      calories: null,
      waterMl: null,
      dryWeightGrams: 85,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0712/2497/files/SUM_front.png?v=1770939979",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // "Meals To Go - Savory Variety 4-Pack" is mistagged vendor: "PMTG" --
    // confirmed live -- but every product this scraper produces is Wild
    // Zora's by construction.
    const result = parseProduct(
      findProduct("Meals To Go - Savory Variety 4-Pack"),
    );
    expect(result.brand).toBe("Wild Zora");
  });

  it("comes back with a null imageUrl rather than throwing when there's no gallery", () => {
    const result = parseProduct(
      findProduct("Meals To Go - Trailblazer Turkey"),
    );
    expect(result.imageUrl).toBeNull();
    expect(result.dryWeightGrams).toBeNull();
  });

  it("always reports null calories and waterMl, since the site only ever publishes them as an image", () => {
    const result = parseProduct(
      findProduct(
        "Quinoa Meals – Herb Roasted Chicken with Spinach, Carrots & Herbs",
      ),
    );
    expect(result.calories).toBeNull();
    expect(result.waterMl).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("fetches from the Meals To Go collection's products.json feed", async () => {
    const fetchImpl = mock(async (url: string) => {
      expect(url).toContain("/collections/meals-to-go/products.json");
      return new Response(JSON.stringify({ products: [{ id: 1 }] }));
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

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
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });
});
