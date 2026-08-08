import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  selectImageUrl,
  shouldSkip,
  type PackitGourmetProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/packit-gourmet";
import { describe, expect, it, mock } from "bun:test";
import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../../../fixtures/packit-gourmet",
);

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

function loadProduct(
  sourceProductId: string,
  url: string,
  fixtureName: string,
): PackitGourmetProduct {
  return { sourceProductId, url, html: loadFixture(fixtureName) };
}

const inStockProduct = loadProduct(
  "1307",
  "https://packitgourmet.com/austintacious-tortilla-soup/",
  "product-austintacious-tortilla-soup.html",
);
const outOfStockProduct = loadProduct(
  "1450",
  "https://packitgourmet.com/southwest-corn-black-bean-salad/",
  "product-out-of-stock.html",
);
const snackPackProduct = loadProduct(
  "1523",
  "https://packitgourmet.com/the-happy-hour-snack-pack/",
  "product-happy-hour-snack-pack.html",
);

describe("parseCalories", () => {
  it("parses a plain 'NNN calories' bullet", () => {
    expect(parseCalories("Some text. 600 calories. More text.")).toBe(600);
  });

  it("parses the 'per serving' phrasing", () => {
    expect(parseCalories("160 calories per serving")).toBe(160);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("1,120 calories")).toBe(1120);
  });

  it("returns null when the phrase is absent", () => {
    expect(
      parseCalories("See individual meals for nutrition information."),
    ).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("reads the ml figure directly out of the oz/ml parenthetical", () => {
    expect(
      parseWaterMl(
        "Add 1-1/2 cups (12 oz / 355 ml) of boiling water to the pouch and stir.",
      ),
    ).toBe(355);
  });

  it("stops at the first mention of water rather than a trailing ingredient", () => {
    expect(
      parseWaterMl(
        "Add 3 cups (24 oz / 709 ml) of cool water and tequila (or your spirit of choice) to taste.",
      ),
    ).toBe(709);
  });

  it("returns null when no water instructions are present", () => {
    expect(
      parseWaterMl("See individual meals for nutrition information."),
    ).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("parses the standard 'Meal Net Weight' bullet", () => {
    expect(parseDryWeightGrams("Meal Net Weight:  5.4 oz | 152 g")).toBe(152);
  });

  it("parses the 'Total Net Weight' phrasing used by multi-item packs", () => {
    expect(parseDryWeightGrams("Total Net Weight:  11.3 oz | 321 g")).toBe(321);
  });

  it("returns null when the bullet is absent", () => {
    expect(parseDryWeightGrams("51 g protein")).toBeNull();
  });
});

describe("selectImageUrl", () => {
  function load(html: string) {
    return cheerio.load(html);
  }

  const OG_IMAGE_HTML = `<meta property="og:image" content="https://cdn.example.com/og-fallback.jpg" />`;

  it("prefers a gallery image named with the '_Graphic' convention", () => {
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Graphic.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe("https://cdn.example.com/Meal_Graphic.jpg");
  });

  it("prefers a gallery image named with the '_MealPouch' convention", () => {
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_MealPouch_sm.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe(
      "https://cdn.example.com/Meal_MealPouch_sm.jpg",
    );
  });

  it("prefers a gallery image named with the 'Package'/'Packaging' convention", () => {
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/MealPackaging_tiny.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe(
      "https://cdn.example.com/MealPackaging_tiny.jpg",
    );
  });

  it("falls back to the second gallery image when no naming convention matches", () => {
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Action_Shot.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Dry.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe(
      "https://cdn.example.com/Meal_Action_Shot.jpg",
    );
  });

  it("falls back to og:image when the gallery has only one image", () => {
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe("https://cdn.example.com/og-fallback.jpg");
  });

  it("falls back to og:image when there is no gallery at all", () => {
    const $ = load(OG_IMAGE_HTML);
    expect(selectImageUrl($)).toBe("https://cdn.example.com/og-fallback.jpg");
  });

  it("ignores a naming-convention match outside the product's own gallery", () => {
    // e.g. a "similar products" carousel elsewhere on the page can contain
    // another product's packaging image with a matching filename.
    const $ = load(`
      ${OG_IMAGE_HTML}
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Main.jpg"></a>
      <a class="productView-thumbnail-link" href="https://cdn.example.com/Meal_Action_Shot.jpg"></a>
      <a class="card-figure__link" href="https://cdn.example.com/OtherProduct_Graphic.jpg"></a>
    `);
    expect(selectImageUrl($)).toBe(
      "https://cdn.example.com/Meal_Action_Shot.jpg",
    );
  });
});

describe("shouldSkip", () => {
  it("includes an in-stock product", () => {
    expect(shouldSkip(inStockProduct)).toBe(false);
  });

  it("skips a product whose og:availability meta tag reports oos", () => {
    expect(shouldSkip(outOfStockProduct)).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const result = parseProduct(inStockProduct);

    expect(result).toEqual({
      sourceVendor: "packit_gourmet",
      sourceProductId: "1307",
      sourceUrl: "https://packitgourmet.com/austintacious-tortilla-soup/",
      name: "Austintacious Tortilla Soup",
      brand: "Packit Gourmet",
      calories: 600,
      waterMl: 355,
      dryWeightGrams: 152,
      imageUrl:
        "https://cdn11.bigcommerce.com/s-f9hc5hcy5o/images/stencil/1280x1280/products/1307/1668/TortillaSoup_Graphic_SQ__67579.1711559621.jpg?c=1",
    });
  });

  it("does not pick up quantities mentioned in customer reviews", () => {
    // The fixture's review text says "20 oz of water" and "2000 calories" --
    // scoping to .tab-about-container should ignore both.
    const result = parseProduct(inStockProduct);
    expect(result.calories).toBe(600);
    expect(result.waterMl).toBe(355);
  });

  it("comes back with a null calories field rather than throwing when data is missing", () => {
    // The Happy Hour Snack Pack bundles several items and defers nutrition
    // info to them individually, so it has no calorie figure of its own.
    const result = parseProduct(snackPackProduct);
    expect(result.calories).toBeNull();
    expect(result.dryWeightGrams).toBe(321);
  });

  it("falls back to og:image when the fixture has no thumbnail gallery", () => {
    // The snack pack fixture has no productView-thumbnail-link markup.
    const result = parseProduct(snackPackProduct);
    expect(result.imageUrl).toBe(
      "https://cdn11.bigcommerce.com/s-f9hc5hcy5o/products/1523/images/1459/Happy_Hour_Snack_Pack__68264.1682439090.386.513.png?c=1",
    );
  });
});

describe("fetchProducts", () => {
  it("crawls category pages until an empty page, dedupes, then fetches each product", async () => {
    const listingHtml = loadFixture("listing-page.html");
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("austintacious-tortilla-soup")) {
        return new Response(
          loadFixture("product-austintacious-tortilla-soup.html"),
        );
      }
      if (url.includes("southwest-corn-black-bean-salad")) {
        return new Response(loadFixture("product-out-of-stock.html"));
      }
      if (url.includes("the-happy-hour-snack-pack")) {
        return new Response(loadFixture("product-happy-hour-snack-pack.html"));
      }
      // Category listing: first page of each category has the 3 fixture
      // products, second page is empty (ends the crawl for that category).
      if (url.includes("page=2")) {
        return new Response("<html><body></body></html>");
      }
      return new Response(listingHtml);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result).toHaveLength(3);
    expect(result.map((p) => p.sourceProductId).sort()).toEqual([
      "1307",
      "1450",
      "1523",
    ]);
    // 4 categories x 2 pages (1 populated + 1 empty stop page) + 3 product pages
    expect(fetchImpl).toHaveBeenCalledTimes(4 * 2 + 3);
  });

  it("throws when a category listing responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });

  it("throws when a product page responds with a non-OK status", async () => {
    const listingHtml = loadFixture("listing-page.html");
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/trail-meals/")) {
        return url.includes("page=2")
          ? new Response("<html><body></body></html>")
          : new Response(listingHtml);
      }
      return new Response("error", { status: 404 });
    });

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/404/);
  });
});
