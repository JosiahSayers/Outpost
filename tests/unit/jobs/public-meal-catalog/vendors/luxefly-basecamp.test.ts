import {
  fetchProducts,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  parseWaterMl,
  selectImageUrl,
  shouldSkip,
  type LuxeflyBasecampListing,
  type LuxeflyBasecampProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/luxefly-basecamp";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/luxefly-basecamp/products.json";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../../../fixtures/luxefly-basecamp",
);

function loadHtml(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf-8");
}

const listings = fixture.products as LuxeflyBasecampListing[];

function findListingProduct(handle: string): LuxeflyBasecampListing {
  const product = listings.find((p) => p.handle === handle);
  if (!product) throw new Error(`Fixture missing product: ${handle}`);
  return product;
}

function loadProduct(
  handle: string,
  htmlFixture: string,
  nutritionFixture: string | null,
): LuxeflyBasecampProduct {
  return {
    ...findListingProduct(handle),
    html: loadHtml(htmlFixture),
    nutritionHtml: nutritionFixture ? loadHtml(nutritionFixture) : null,
  };
}

describe("parseDryWeightGrams", () => {
  it("reads the single variant's shipping weight", () => {
    expect(parseDryWeightGrams(findListingProduct("chicken-marbella"))).toBe(
      170,
    );
  });

  it("reads the first variant's weight for a two-size product, since both sizes record the same weight", () => {
    expect(
      parseDryWeightGrams(
        findListingProduct(
          "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
        ),
      ),
    ).toBe(170);
  });
});

describe("selectImageUrl", () => {
  it("uses the first image when it isn't the cooked/plated shot, capped to a bounded width", () => {
    const product = findListingProduct("chicken-marbella");
    const expected = new URL(product.images[0]!.src);
    expected.searchParams.set("width", "1600");
    expect(selectImageUrl(product)).toBe(expected.toString());
  });

  it("skips a first image whose filename says it's the cooked dish", () => {
    const product = findListingProduct("filet-mignon-beef-stroganoff");
    expect(product.images[0]!.src).toContain("stroganoff_cooked");

    const expected = new URL(product.images[1]!.src);
    expected.searchParams.set("width", "1600");
    expect(selectImageUrl(product)).toBe(expected.toString());
  });

  it("adds the width param even to an already-small image, bounding Shopify's HEIC-to-PNG re-encode size", () => {
    // Confirmed live: this vendor's HEIC uploads occasionally re-encode to an
    // oversized lossless PNG on Shopify's CDN, blowing past the shared image
    // pipeline's byte cap. The width param is applied unconditionally rather
    // than only for .heic sources, since a plain JPEG benefits identically.
    const product = findListingProduct("chicken-marbella");
    expect(selectImageUrl(product)).toContain("width=1600");
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock meal", () => {
    expect(shouldSkip(findListingProduct("chicken-marbella"))).toBe(false);
  });

  it("includes a meal with individual and serves-2 size variants", () => {
    expect(
      shouldSkip(
        findListingProduct(
          "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
        ),
      ),
    ).toBe(false);
  });

  it("skips the digital gift card, whose variants are all non-shippable", () => {
    expect(
      shouldSkip(
        findListingProduct(
          "give-the-gift-of-healthy-nutritious-anywhere-meals",
        ),
      ),
    ).toBe(true);
  });

  it("skips the merch-tagged Titanium Fork", () => {
    expect(shouldSkip(findListingProduct("titanium-fork"))).toBe(true);
  });

  it("skips the multi-bag subscription product", () => {
    expect(
      shouldSkip(
        findListingProduct(
          "saucefly-basecamp-subscription-1x-every-30-days-3-bags-includes-a-20-discount",
        ),
      ),
    ).toBe(true);
  });

  it("includes a meal whose only variant is out of stock, since a user may already own it or source it elsewhere", () => {
    expect(
      shouldSkip(findListingProduct("black-and-blueberry-shortbread-cobbler")),
    ).toBe(false);
  });
});

describe("parseCalories", () => {
  it("reads the calories figure out of the itsgot.com nutrition label's data-react-props JSON", () => {
    expect(parseCalories(loadHtml("nutrition-chicken-marbella.html"))).toBe(
      1030,
    );
  });

  it("returns null when the product has no nutrition label at all", () => {
    expect(parseCalories(null)).toBeNull();
  });

  it("returns null when the fetched markup has no ProductLabel mount point", () => {
    expect(parseCalories("<html><body>no label here</body></html>")).toBeNull();
  });
});

describe("parseWaterMl", () => {
  it("reads a single oz figure", () => {
    expect(
      parseWaterMl(
        "1. Remove oxygen packet\n2. Add 6 oz of boiling water to bag",
      ),
    ).toBe(177);
  });

  it("averages an oz range rather than picking either bound", () => {
    expect(
      parseWaterMl(
        "1. Remove oxygen packet\n2. Add 8-12 oz of boiling water to bag",
      ),
    ).toBe(296);
  });

  it("returns null for the generic 'add boiling water directly to bag' copy with no quantity", () => {
    expect(parseWaterMl("add boiling water directly to bag")).toBeNull();
  });

  it("returns null for an empty Meal Preparation accordion", () => {
    expect(parseWaterMl("")).toBeNull();
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a complete product", () => {
    const product = loadProduct(
      "chicken-marbella",
      "product-chicken-marbella.html",
      "nutrition-chicken-marbella.html",
    );
    const result = parseProduct(product);

    expect(result).toEqual({
      sourceVendor: "luxefly_basecamp",
      sourceProductId: "10010129531177",
      sourceUrl: "https://luxeflybasecamp.com/products/chicken-marbella",
      name: "Chicken Marbella",
      brand: "Luxefly Basecamp",
      calories: 1030,
      waterMl: null,
      dryWeightGrams: 170,
      imageUrl: selectImageUrl(product),
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // Confirmed live the vendor field is inconsistently "Luxefly Basecamp"
    // vs "Luxefly Base Camp" (with a space) depending on the product.
    const product = loadProduct(
      "chicken-marbella",
      "product-chicken-marbella.html",
      "nutrition-chicken-marbella.html",
    );
    expect(parseProduct(product).brand).toBe("Luxefly Basecamp");
  });

  it("reads a specific oz water figure when the prep copy states one", () => {
    const product = loadProduct(
      "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
      "product-wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole.html",
      "nutrition-wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole.html",
    );
    const result = parseProduct(product);
    expect(result.waterMl).toBe(177);
    expect(result.calories).toBe(230);
  });

  it("averages a ranged oz water figure", () => {
    const product = loadProduct(
      "black-and-blueberry-shortbread-cobbler",
      "product-black-and-blueberry-shortbread-cobbler.html",
      "nutrition-black-and-blueberry-shortbread-cobbler.html",
    );
    const result = parseProduct(product);
    expect(result.waterMl).toBe(296);
    expect(result.calories).toBe(550);
  });

  it("skips the cooked/plated image in favor of the packaging shot", () => {
    const product = loadProduct(
      "filet-mignon-beef-stroganoff",
      "product-filet-mignon-beef-stroganoff.html",
      "nutrition-filet-mignon-beef-stroganoff.html",
    );
    const result = parseProduct(product);
    expect(result.imageUrl).toBe(selectImageUrl(product));
    expect(result.imageUrl).not.toContain("stroganoff_cooked");
    expect(result.calories).toBe(610);
  });

  it("comes back with a null calories rather than throwing when the product has no itsgot nutrition label", () => {
    const product = loadProduct(
      "chicken-marbella",
      "product-chicken-marbella.html",
      null,
    );
    expect(parseProduct(product).calories).toBeNull();
  });
});

describe("fetchProducts", () => {
  const nutritionUrls: Record<string, string> = {
    "chicken-marbella": "https://itsgot.com/users/1369/labels/23547/embed",
    "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole":
      "https://itsgot.com/users/1369/labels/11982/embed",
    "black-and-blueberry-shortbread-cobbler":
      "https://itsgot.com/users/1369/labels/11673/embed",
    "filet-mignon-beef-stroganoff":
      "https://itsgot.com/users/1369/labels/11672/embed",
  };

  function baseFetchImpl(url: string): Response | null {
    if (url.includes("/products.json")) {
      return new Response(JSON.stringify(fixture));
    }
    if (url === nutritionUrls["chicken-marbella"]) {
      return new Response(loadHtml("nutrition-chicken-marbella.html"));
    }
    if (
      url ===
      nutritionUrls[
        "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole"
      ]
    ) {
      return new Response(
        loadHtml(
          "nutrition-wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole.html",
        ),
      );
    }
    if (url === nutritionUrls["black-and-blueberry-shortbread-cobbler"]) {
      return new Response(
        loadHtml("nutrition-black-and-blueberry-shortbread-cobbler.html"),
      );
    }
    if (url === nutritionUrls["filet-mignon-beef-stroganoff"]) {
      return new Response(
        loadHtml("nutrition-filet-mignon-beef-stroganoff.html"),
      );
    }
    if (url.includes("/products/chicken-marbella")) {
      return new Response(loadHtml("product-chicken-marbella.html"));
    }
    if (
      url.includes(
        "/products/wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
      )
    ) {
      return new Response(
        loadHtml(
          "product-wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole.html",
        ),
      );
    }
    if (url.includes("/products/black-and-blueberry-shortbread-cobbler")) {
      return new Response(
        loadHtml("product-black-and-blueberry-shortbread-cobbler.html"),
      );
    }
    if (url.includes("/products/filet-mignon-beef-stroganoff")) {
      return new Response(
        loadHtml("product-filet-mignon-beef-stroganoff.html"),
      );
    }
    return null;
  }

  it("filters by tag/title/shippability before fetching detail pages and nutrition labels, then parses only the survivors", async () => {
    const fetchImpl = mock(async (url: string) => {
      const res = baseFetchImpl(url);
      if (!res) {
        throw new Error(`Unexpected fetch during test: ${url}`);
      }
      return res;
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.handle).sort()).toEqual([
      "black-and-blueberry-shortbread-cobbler",
      "chicken-marbella",
      "filet-mignon-beef-stroganoff",
      "wild-oregon-mushrooms-and-creamy-polenta-with-red-oaxacan-mole",
    ]);
    // 1 listing page (7 products < the 250 page size) + a product-page fetch
    // and a nutrition-label fetch for each of the 4 survivors -- the gift
    // card, Titanium Fork, and subscription bundle must never trigger
    // either request.
    expect(fetchImpl).toHaveBeenCalledTimes(1 + 4 * 2);

    const chickenMarbella = result.find((p) => p.handle === "chicken-marbella");
    expect(chickenMarbella?.nutritionHtml).toContain("Chicken Marbella");
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

  it("throws when the itsgot.com nutrition label responds with a non-OK status", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.includes("itsgot.com")) {
        return new Response("error", { status: 503 });
      }
      return new Response(loadHtml("product-chicken-marbella.html"));
    });

    await expect(
      fetchProducts(fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/503/);
  });
});
