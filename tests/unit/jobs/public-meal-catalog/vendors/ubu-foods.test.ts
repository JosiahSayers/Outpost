import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
  type UbuFoodsProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/ubu-foods";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/ubu-foods/products.json";

const FIXTURE_DIR = join(import.meta.dir, "../../../../fixtures/ubu-foods");

function loadHtml(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

function makeProduct(overrides: Partial<UbuFoodsProduct>): UbuFoodsProduct {
  return {
    sourceProductId: "9871830057278-cilantro-lime",
    sourceUrl:
      "https://ubufoods.com/products/ubu-hikers-hummus-4-pack?variant=46975085216062",
    productTitle: "uBu Hiker's Hummus (4-pack)",
    flavor: "Cilantro Lime (4-Pack)",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/cil_front.jpg",
    html: loadHtml("product-hummus.html"),
    ...overrides,
  };
}

const cilantroLime = makeProduct({});
const roastedGarlic = makeProduct({
  sourceProductId: "9871830057278-roasted-garlic",
  sourceUrl:
    "https://ubufoods.com/products/ubu-hikers-hummus-4-pack?variant=46975085248830",
  flavor: "Roasted Garlic (4-Pack)",
  imageUrl:
    "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/garlic_front.jpg",
});
const everythingBagel = makeProduct({
  sourceProductId: "9871830057278-everything-bagel",
  sourceUrl:
    "https://ubufoods.com/products/ubu-hikers-hummus-4-pack?variant=48786844713278",
  flavor: "Everything Bagel (4-Pack)",
  imageUrl:
    "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/every_front.jpg",
});

describe("parseCalories", () => {
  it("parses the 'Calories: N' figure from a matched flavor chunk", () => {
    expect(
      parseCalories("Serving Size: 2 oz\nCalories: 35; Calories from Fat: 5"),
    ).toBe(35);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("Calories: 1,200")).toBe(1200);
  });

  it("returns null when passed null (no matching flavor chunk found)", () => {
    expect(parseCalories(null)).toBeNull();
  });

  it("returns null when the chunk has no Calories line", () => {
    expect(parseCalories("Serving Size: 2 oz (reconstituted)")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the pouch size and multiplies by the 4-pack count", () => {
    // 1.5 oz per pouch * 4 pouches ~= 170g.
    expect(
      parseDryWeightGrams(
        "These are four-packs of Dayhiker Pouches (1.5 oz), which are designed as a snack.",
      ),
    ).toBe(170);
  });

  it("returns null when the pouch size isn't stated", () => {
    expect(parseDryWeightGrams("Just add water, mix, and enjoy.")).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes every flavor item regardless of stock", () => {
    expect(shouldSkip(cilantroLime)).toBe(false);
  });
});

describe("parseProduct", () => {
  it("assembles a distinct item per flavor, stripping the '(4-Pack)' suffix from the display name and the redundant 'uBu' brand prefix and pack-size suffix from the title", () => {
    expect(parseProduct(cilantroLime)).toEqual({
      sourceVendor: "ubu_foods",
      sourceProductId: "9871830057278-cilantro-lime",
      sourceUrl:
        "https://ubufoods.com/products/ubu-hikers-hummus-4-pack?variant=46975085216062",
      name: "Hiker's Hummus - Cilantro Lime",
      brand: "uBu Foods",
      calories: 35,
      waterMl: null,
      dryWeightGrams: 170,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/cil_front.jpg",
    });
  });

  it("uses the matched flavor's own calorie figure, not another flavor's", () => {
    expect(parseProduct(cilantroLime).calories).toBe(35);
    expect(parseProduct(roastedGarlic).calories).toBe(40);
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // Confirmed live the hummus product's own `vendor` field reads "uBu"
    // while other listings in the same collection read "uBu Foods".
    expect(parseProduct(cilantroLime).brand).toBe("uBu Foods");
  });

  it("always reports a null waterMl, since the site never states a water quantity", () => {
    expect(parseProduct(cilantroLime).waterMl).toBeNull();
    expect(parseProduct(roastedGarlic).waterMl).toBeNull();
  });

  it("comes back with a null calories field rather than throwing when the flavor has no nutrition copy", () => {
    // The fixture's Nutritional Information accordion has no Everything
    // Bagel entry, same as the live site.
    expect(parseProduct(everythingBagel).calories).toBeNull();
  });

  it("does not pick up the flavor names listed in the Ingredients accordion", () => {
    // Both accordions list all four flavor names -- scoping to the
    // Nutritional Information accordion should ignore the Ingredients one.
    const result = parseProduct(cilantroLime);
    expect(result.calories).toBe(35);
  });
});

describe("fetchProducts", () => {
  it("filters to the food-tagged product, excludes the Starter Pack variant, and fetches the product page once", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (
        url.startsWith("https://ubufoods.com/products/ubu-hikers-hummus-4-pack")
      ) {
        return new Response(loadHtml("product-hummus.html"));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.sourceProductId).sort()).toEqual([
      "9871830057278-cilantro-lime",
      "9871830057278-everything-bagel",
      "9871830057278-roasted-garlic",
    ]);
    // 1 collection products.json page + 1 product page (Kuksa Mug and Gift
    // Set are filtered out before their pages would ever be fetched).
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("uses each flavor's own variant image", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      return new Response(loadHtml("product-hummus.html"));
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);
    const byId = new Map(result.map((p) => [p.sourceProductId, p]));

    expect(byId.get("9871830057278-cilantro-lime")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/cil_front.jpg",
    );
    expect(byId.get("9871830057278-roasted-garlic")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0738/4036/1790/files/garlic_front.jpg",
    );
  });

  it("throws when products.json responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });

  it("throws when the product page responds with a non-OK status", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      return new Response("error", { status: 404 });
    });

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/404/);
  });
});
