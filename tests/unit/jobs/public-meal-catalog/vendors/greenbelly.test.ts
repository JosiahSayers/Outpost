import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type GreenbellyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/greenbelly";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/greenbelly/products.json";

const FIXTURE_DIR = join(import.meta.dir, "../../../../fixtures/greenbelly");

function loadHtml(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

function makeProduct(overrides: Partial<GreenbellyProduct>): GreenbellyProduct {
  return {
    sourceProductId: "1-flavor",
    sourceUrl: "https://greenbelly.co/products/meal2go?variant=1",
    productTitle: "Greenbelly Meals",
    flavor: "Chocolate",
    isDrinkableMeal: false,
    variantGrams: 4536,
    imageUrl: null,
    html: loadHtml("product-meal2go.html"),
    ...overrides,
  };
}

const meal2goChocolate = makeProduct({
  sourceProductId: "1280756164-chocolate",
  sourceUrl: "https://greenbelly.co/products/meal2go?variant=4630001412",
  flavor: "Chocolate",
  imageUrl:
    "https://cdn.shopify.com/s/files/1/0384/0233/files/Variety.png?v=1683187616",
});
const meal2goApricot = makeProduct({
  sourceProductId: "1280756164-apricot",
  sourceUrl: "https://greenbelly.co/products/meal2go?variant=19912571012",
  flavor: "Apricot",
  variantGrams: 454,
  imageUrl:
    "https://cdn.shopify.com/s/files/1/0384/0233/files/Variety.png?v=1683187616",
});
const protein = makeProduct({
  sourceProductId: "7171590226018-chocolate-crunch",
  sourceUrl:
    "https://greenbelly.co/products/greenbelly-meal2go-protein?variant=41231668412514",
  productTitle: "(NEW!) Greenbelly Meals Protein",
  flavor: "Chocolate Crunch",
  html: loadHtml("product-protein.html"),
  imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/Protein.png",
});
const mudMealVanilla = makeProduct({
  sourceProductId: "6581599174754-vanilla-original",
  sourceUrl:
    "https://greenbelly.co/products/mud-meals-2?variant=39384813863010",
  productTitle: "Mud Meal 2.0",
  flavor: "Vanilla | Original",
  isDrinkableMeal: true,
  variantGrams: 1134,
  html: loadHtml("product-mud-meal.html"),
  imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/MudMeal.png",
});
const mudMealStrawberry = makeProduct({
  sourceProductId: "6581599174754-strawberry-plant-based",
  sourceUrl:
    "https://greenbelly.co/products/mud-meals-2?variant=39384813895778",
  productTitle: "Mud Meal 2.0",
  flavor: "Strawberry | Plant Based",
  isDrinkableMeal: true,
  variantGrams: 1134,
  html: loadHtml("product-mud-meal.html"),
  imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/MudMeal.png",
});

describe("parseCalories", () => {
  it("parses the 'Calories: N' nutrition-label figure", () => {
    expect(
      parseCalories("Serving Size: 2 Bars (155g) Calories: 665 Protein: 18g"),
    ).toBe(665);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("Calories: 1,200")).toBe(1200);
  });

  it("returns null when passed null (no matching flavor heading found)", () => {
    expect(parseCalories(null)).toBeNull();
  });

  it("returns null when the text has no nutrition label", () => {
    expect(parseCalories("Ready to eat, no prep needed.")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("averages the 'roughly N-Noz of water' range", () => {
    // Mud Meal states the same "6-10 oz" range rather than a single figure --
    // confirmed live.
    expect(
      parseWaterMl(
        "Add 2 heaping scoops of Mud Meal to roughly 6-10 oz of water.",
      ),
    ).toBe(237);
  });

  it("reads a single figure when no range is given", () => {
    expect(parseWaterMl("Mix it up to roughly 8 oz of water.")).toBe(237);
  });

  it("returns null when no water instructions are present", () => {
    expect(
      parseWaterMl("A true ready-to-eat meal. Just tear open and eat."),
    ).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the single meal's stated FAQ weight for a bar product, regardless of flavor", () => {
    expect(
      parseDryWeightGrams(
        meal2goChocolate,
        "About 5.5 oz (155 g). One package = one meal = two bars.",
      ),
    ).toBe(155);
    expect(
      parseDryWeightGrams(
        meal2goApricot,
        "About 5.5 oz (155 g). One package = one meal = two bars.",
      ),
    ).toBe(155);
  });

  it("reads that flavor's own variant weight for Mud Meal rather than the FAQ text", () => {
    expect(parseDryWeightGrams(mudMealVanilla, "no weight stated here")).toBe(
      1134,
    );
  });

  it("returns null for a bar product when the FAQ weight is absent", () => {
    expect(
      parseDryWeightGrams(meal2goChocolate, "no weight stated here"),
    ).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes every flavor item, including Mud Meal even though its variants are all out of stock", () => {
    expect(shouldSkip(meal2goChocolate)).toBe(false);
    expect(shouldSkip(mudMealVanilla)).toBe(false);
  });
});

describe("parseProduct", () => {
  it("assembles a distinct item per bar flavor, hardcoding waterMl to 0", () => {
    expect(parseProduct(meal2goChocolate)).toEqual({
      sourceVendor: "greenbelly",
      sourceProductId: "1280756164-chocolate",
      sourceUrl: "https://greenbelly.co/products/meal2go?variant=4630001412",
      name: "Greenbelly Meals - Chocolate",
      brand: "Greenbelly",
      calories: 660,
      waterMl: 0,
      dryWeightGrams: 155,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0384/0233/files/Variety.png?v=1683187616",
    });

    expect(parseProduct(meal2goApricot)).toEqual({
      sourceVendor: "greenbelly",
      sourceProductId: "1280756164-apricot",
      sourceUrl: "https://greenbelly.co/products/meal2go?variant=19912571012",
      name: "Greenbelly Meals - Apricot",
      brand: "Greenbelly",
      calories: 665,
      waterMl: 0,
      dryWeightGrams: 155,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0384/0233/files/Variety.png?v=1683187616",
    });
  });

  it("uses the matched flavor's own calorie figure, not another flavor's", () => {
    expect(parseProduct(meal2goChocolate).calories).toBe(660);
    expect(parseProduct(meal2goApricot).calories).toBe(665);
  });

  it("assembles the protein bar's single flavor, hardcoding waterMl to 0 and stripping the '(NEW!)' marketing prefix", () => {
    expect(parseProduct(protein)).toEqual({
      sourceVendor: "greenbelly",
      sourceProductId: "7171590226018-chocolate-crunch",
      sourceUrl:
        "https://greenbelly.co/products/greenbelly-meal2go-protein?variant=41231668412514",
      name: "Greenbelly Meals Protein - Chocolate Crunch",
      brand: "Greenbelly",
      calories: 640,
      waterMl: 0,
      dryWeightGrams: 144,
      imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/Protein.png",
    });
  });

  it("assembles a distinct item per Mud Meal flavor, parsing the real shared water requirement rather than hardcoding 0, and stripping the '| <qualifier>' suffix from the display name", () => {
    expect(parseProduct(mudMealVanilla)).toEqual({
      sourceVendor: "greenbelly",
      sourceProductId: "6581599174754-vanilla-original",
      sourceUrl:
        "https://greenbelly.co/products/mud-meals-2?variant=39384813863010",
      name: "Mud Meal 2.0 - Vanilla",
      brand: "Greenbelly",
      calories: 400,
      waterMl: 237,
      dryWeightGrams: 1134,
      imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/MudMeal.png",
    });

    expect(parseProduct(mudMealStrawberry)).toEqual({
      sourceVendor: "greenbelly",
      sourceProductId: "6581599174754-strawberry-plant-based",
      sourceUrl:
        "https://greenbelly.co/products/mud-meals-2?variant=39384813895778",
      name: "Mud Meal 2.0 - Strawberry",
      brand: "Greenbelly",
      calories: 400,
      waterMl: 237,
      dryWeightGrams: 1134,
      imageUrl: "https://cdn.shopify.com/s/files/1/0384/0233/files/MudMeal.png",
    });
  });

  it("still matches the flavor's nutrition-tab heading correctly even though the '| <qualifier>' suffix is stripped from the display name", () => {
    // The heading match uses the full "Vanilla | Original" value (it has to,
    // since that's what the page text says) -- only the display name drops
    // the qualifier.
    expect(parseProduct(mudMealVanilla).calories).toBe(400);
    expect(parseProduct(mudMealStrawberry).calories).toBe(400);
  });

  it("does not pick up quantities mentioned in customer reviews outside the tabs container", () => {
    // The meal2go fixture's review blurb says "20 oz of water" and "2000
    // calories" -- scoping to .dm-product-tabs should ignore both.
    const result = parseProduct(meal2goChocolate);
    expect(result.calories).toBe(660);
    expect(result.waterMl).toBe(0);
  });
});

describe("fetchProducts", () => {
  it("expands each Shopify product into one item per flavor, excluding Variety, fetching each product's page once", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.startsWith("https://greenbelly.co/products/meal2go")) {
        return new Response(loadHtml("product-meal2go.html"));
      }
      if (
        url.startsWith(
          "https://greenbelly.co/products/greenbelly-meal2go-protein",
        )
      ) {
        return new Response(loadHtml("product-protein.html"));
      }
      if (url.startsWith("https://greenbelly.co/products/mud-meals-2")) {
        return new Response(loadHtml("product-mud-meal.html"));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.sourceProductId).sort()).toEqual([
      "1280756164-apricot",
      "1280756164-chocolate",
      "6581599174754-strawberry-plant-based",
      "6581599174754-vanilla-original",
      "7171590226018-chocolate-crunch",
    ]);
    // 1 products.json page + 3 product pages (one per Shopify product, not
    // one per flavor -- flavors share the same page).
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("uses each flavor's own variant image rather than the product's first (Variety group shot) image", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.startsWith("https://greenbelly.co/products/meal2go")) {
        return new Response(loadHtml("product-meal2go.html"));
      }
      if (url.startsWith("https://greenbelly.co/products/mud-meals-2")) {
        return new Response(loadHtml("product-mud-meal.html"));
      }
      return new Response(loadHtml("product-protein.html"));
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);
    const byId = new Map(result.map((p) => [p.sourceProductId, p]));

    expect(byId.get("1280756164-chocolate")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0384/0233/files/DarkChocolateBanana.png?v=1683187616",
    );
    expect(byId.get("1280756164-apricot")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0384/0233/files/PeanutApricot.png?v=1683187616",
    );
    expect(byId.get("6581599174754-vanilla-original")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0384/0233/products/MMVanillaF.png?v=1684750115",
    );
    expect(byId.get("6581599174754-strawberry-plant-based")?.imageUrl).toBe(
      "https://cdn.shopify.com/s/files/1/0384/0233/products/MMStrawberryF.png?v=1684750115",
    );
  });

  it("throws when products.json responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });

  it("throws when a product page responds with a non-OK status", async () => {
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
