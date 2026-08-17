import {
  fetchProducts,
  parseCalories,
  parseCaloriesFromImage,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  shouldSkip,
  type BighornMountainFoodProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/bighorn-mountain-food";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/bighorn-mountain-food/products.json";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../../../fixtures/bighorn-mountain-food",
);

function loadHtml(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

function findListingProduct(handle: string) {
  const product = fixture.products.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

function loadProduct(
  handle: string,
  htmlFixture: string,
): BighornMountainFoodProduct {
  return { ...findListingProduct(handle), html: loadHtml(htmlFixture) };
}

describe("parseCalories", () => {
  it("parses the 'satisfying calories' phrasing", () => {
    expect(
      parseCalories(
        "700 satisfying calories in a lightweight pouch keep you powered up.",
      ),
    ).toBe(700);
  });

  it("parses the 'energizing calories' phrasing", () => {
    expect(
      parseCalories(
        "790 energizing calories in a lightweight pouch keep you powered up.",
      ),
    ).toBe(790);
  });

  it("strips thousands separators", () => {
    expect(
      parseCalories("1,120 satisfying calories in a lightweight pouch."),
    ).toBe(1120);
  });

  it("returns null when the phrase is absent", () => {
    expect(
      parseCalories("44g of premium protein from tender white chicken."),
    ).toBeNull();
  });
});

describe("parseCaloriesFromImage", () => {
  it("reads the calorie count baked into a packshot filename", () => {
    expect(
      parseCaloriesFromImage(
        "https://cdn.shopify.com/s/files/1/0678/9074/1485/files/BirriaPackShot-640Calories_0659f689.png?v=1772484635",
      ),
    ).toBe(640);
  });

  it("returns null when the filename carries no calorie figure", () => {
    expect(
      parseCaloriesFromImage(
        "https://cdn.shopify.com/s/files/1/0678/9074/1485/files/VodkaPasta.png?v=1781797584",
      ),
    ).toBeNull();
  });

  it("returns null for a null image url", () => {
    expect(parseCaloriesFromImage(null)).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("converts a mixed-number cup quantity to ml", () => {
    expect(
      parseWaterMl(
        "Quick & Easy: Freeze-dried to lock in fresh flavors; add 1 1/2 cups boiling water, ready in 15 minutes.",
      ),
    ).toBe(355);
  });

  it("handles a different mixed-number cup quantity", () => {
    expect(
      parseWaterMl(
        "Quick & Easy: Freeze-dried to lock in fresh flavors; add 1 1/4 cups boiling water, ready in 15 minutes.",
      ),
    ).toBe(296);
  });

  it("returns null when no water instructions are present", () => {
    expect(
      parseWaterMl("Clean Fuel: USA-made with farmer-sourced ingredients."),
    ).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("reads the '1 Pack' variant's shipping weight", () => {
    expect(
      parseDryWeightGrams(findListingProduct("chicken-alla-vodka-pasta")),
    ).toBe(142);
  });

  it("reads the '1 Packs' variant's shipping weight (vendor typo)", () => {
    expect(
      parseDryWeightGrams(
        findListingProduct("creamy-dijon-chicken-with-tarragon-rice"),
      ),
    ).toBe(162);
  });

  it("returns null when no single-pouch variant is present", () => {
    expect(
      parseDryWeightGrams(findListingProduct("chicken-coop-expedition-pack")),
    ).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock retail meal", () => {
    expect(shouldSkip(findListingProduct("chicken-alla-vodka-pasta"))).toBe(
      false,
    );
  });

  it("includes a retail meal whose every variant is out of stock, since a user may already own it or source it elsewhere", () => {
    expect(
      shouldSkip(findListingProduct("the-best-butter-chicken-and-rice")),
    ).toBe(false);
  });

  it("skips a wholesale-tagged duplicate of a retail listing", () => {
    expect(
      shouldSkip(findListingProduct("chicken-alla-vodka-pasta-case-15-meals")),
    ).toBe(true);
  });

  it("skips an Expedition Pack bundle", () => {
    expect(shouldSkip(findListingProduct("chicken-coop-expedition-pack"))).toBe(
      true,
    );
  });

  it("skips a Coozie accessory", () => {
    expect(shouldSkip(findListingProduct("thermal-insulated-coozie"))).toBe(
      true,
    );
  });

  it("skips the internal marketing insert card", () => {
    expect(shouldSkip(findListingProduct("sample-box-insert"))).toBe(true);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const product = loadProduct(
      "chicken-alla-vodka-pasta",
      "product-chicken-alla-vodka-pasta.html",
    );
    const result = parseProduct(product);

    expect(result).toEqual({
      sourceVendor: "bighorn_mountain_food",
      sourceProductId: "9362186993901",
      sourceUrl: "https://bighornmf.com/products/chicken-alla-vodka-pasta",
      name: "Chicken alla Vodka Pasta",
      brand: "Bighorn Mountain Food",
      calories: 700,
      waterMl: 355,
      dryWeightGrams: 142,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0678/9074/1485/files/VodkaPasta.png?v=1781797584",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The live vendor field is the all-caps "BIGHORN Mountain Food" -- every
    // product this scraper produces is Bighorn's own by construction.
    const product = loadProduct(
      "chicken-alla-vodka-pasta",
      "product-chicken-alla-vodka-pasta.html",
    );
    expect(parseProduct(product).brand).toBe("Bighorn Mountain Food");
  });

  it("prefers the calorie count baked into the packshot filename over a stale highlight bullet", () => {
    // Mexican Style Birria & Rice's highlight bullet is stuck at a
    // pre-recipe-change 490, but its packshot filename (and printed
    // Nutrition Facts Panel) both say 640 -- the current figure.
    const product = loadProduct(
      "spicy-mexican-birria-and-rice",
      "product-spicy-mexican-birria-and-rice.html",
    );
    expect(parseProduct(product).calories).toBe(640);
  });

  it("reads a different product's own cup quantity rather than a hardcoded figure", () => {
    const product = loadProduct(
      "the-best-butter-chicken-and-rice",
      "product-the-best-butter-chicken-and-rice.html",
    );
    expect(parseProduct(product).waterMl).toBe(296);
  });

  it("comes back with a null waterMl rather than throwing when the hero-highlights list is absent", () => {
    // The creamy-dijon fixture only has the features-highlights block (for
    // calories), not the product__hero-highlights list water is read from.
    const product = loadProduct(
      "creamy-dijon-chicken-with-tarragon-rice",
      "product-creamy-dijon-chicken-with-tarragon-rice.html",
    );
    expect(parseProduct(product).waterMl).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("filters by product_type/tag/title before fetching detail pages, then parses only the survivors", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.includes("the-best-butter-chicken-and-rice")) {
        return new Response(
          loadHtml("product-the-best-butter-chicken-and-rice.html"),
        );
      }
      if (url.includes("creamy-dijon-chicken-with-tarragon-rice")) {
        return new Response(
          loadHtml("product-creamy-dijon-chicken-with-tarragon-rice.html"),
        );
      }
      if (url.includes("chicken-alla-vodka-pasta")) {
        return new Response(loadHtml("product-chicken-alla-vodka-pasta.html"));
      }
      if (url.includes("spicy-mexican-birria-and-rice")) {
        return new Response(
          loadHtml("product-spicy-mexican-birria-and-rice.html"),
        );
      }
      throw new Error(`Unexpected fetch during test: ${url}`);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.handle).sort()).toEqual([
      "chicken-alla-vodka-pasta",
      "creamy-dijon-chicken-with-tarragon-rice",
      "spicy-mexican-birria-and-rice",
      "the-best-butter-chicken-and-rice",
    ]);
    // 1 listing page (8 products < the 250 page size, so no second page) + a
    // detail-page fetch for only the 4 survivors -- the wholesale duplicate,
    // Expedition Pack, Coozie, and marketing insert must never trigger a
    // request.
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("throws when products.json responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/500/);
  });

  it("throws when a product detail page responds with a non-OK status", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      return new Response("error", { status: 404 });
    });

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/404/);
  });
});
