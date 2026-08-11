import {
  fetchProducts,
  mountainHouseScraper,
  parseCalories,
  parseDryWeightGrams,
  parseProduct,
  shouldSkip,
  type MountainHouseProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/mountain-house";
import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import fixture from "../../../../fixtures/mountain-house/products.json";

const FIXTURE_DIR = join(
  import.meta.dir,
  "../../../../fixtures/mountain-house",
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
): MountainHouseProduct {
  return { ...findListingProduct(handle), html: loadHtml(htmlFixture) };
}

describe("parseCalories", () => {
  it("parses the 'Calories/Per Pouch' cell with no separating whitespace", () => {
    // The site's rendered markup has no whitespace between adjacent table
    // cells, so the real scraped text looks like "...Pouch420Total Fat...".
    expect(parseCalories("Calories/Per Pouch420Total Fat16g / 21%")).toBe(420);
  });

  it("strips thousands separators", () => {
    expect(parseCalories("Calories/Per Pouch1,120")).toBe(1120);
  });

  it("returns null when the phrase is absent", () => {
    expect(parseCalories("Total Fat16g / 21%")).toBeNull();
  });
});

describe("parseDryWeightGrams", () => {
  it("multiplies servings per container by grams per serving", () => {
    expect(
      parseDryWeightGrams(
        "2 servings per containerServing size 1 cups (46g) dry mix(makes 1 cup prepared)",
      ),
    ).toBe(92);
  });

  it("handles fractional grams-per-serving figures", () => {
    expect(
      parseDryWeightGrams(
        "2 servings per containerServing size 1 cup (42.5g) dry mixCalories/Per Pouch460",
      ),
    ).toBe(85);
  });

  it("returns null for a single-serving 'Serving size 1 package' item", () => {
    // Pro-Paks and other single-serving items never state a gram figure.
    expect(
      parseDryWeightGrams("Serving size 1 packageCalories/Per Pouch610"),
    ).toBeNull();
  });
});

describe("shouldSkip", () => {
  it("includes a normal in-stock Adventure Meals pouch", () => {
    expect(shouldSkip(findListingProduct("beef-stew-pouch"))).toBe(false);
  });

  it("includes a normal in-stock Pro-Pak", () => {
    expect(shouldSkip(findListingProduct("beef-stew-pro-pak"))).toBe(false);
  });

  it("skips a Kit-tagged bundle", () => {
    expect(shouldSkip(findListingProduct("best-sellers-kit"))).toBe(true);
  });

  it("skips a Bucket-tagged assortment", () => {
    expect(
      shouldSkip(findListingProduct("classic-meal-assortment-bucket")),
    ).toBe(true);
  });

  it("skips a Can-tagged emergency-storage item", () => {
    expect(shouldSkip(findListingProduct("diced-chicken"))).toBe(true);
  });

  it("skips a 2-Pack-tagged duplicate listing", () => {
    expect(shouldSkip(findListingProduct("breakfast-skillet-2-pack"))).toBe(
      true,
    );
  });

  it("includes a product whose only variant is out of stock, since a user may already own it or source it elsewhere", () => {
    expect(
      shouldSkip(
        findListingProduct("mexican-style-adobo-rice-chicken-pro-pak"),
      ),
    ).toBe(false);
  });
});

describe("parseProduct", () => {
  it("assembles the full scraped shape for a multi-serving pouch", () => {
    const product = loadProduct("beef-stew-pouch", "product-beef-stew.html");
    const result = parseProduct(product);

    expect(result).toEqual({
      sourceVendor: "mountain_house",
      sourceProductId: "4409948471360",
      sourceUrl: "https://mountainhouse.com/products/beef-stew-pouch",
      name: "Beef Stew",
      brand: "Mountain House",
      calories: 420,
      waterMl: null,
      dryWeightGrams: 92,
      imageUrl:
        "https://cdn.shopify.com/s/files/1/0085/1171/7440/files/55145-beef-stew-pouch.jpg?v=1756029595",
    });
  });

  it("hardcodes the brand rather than trusting the vendor field", () => {
    // The live vendor field is "Oregon Freeze Dry" (the parent company), not
    // "Mountain House" -- every product this scraper produces is Mountain
    // House by construction.
    const product = loadProduct("beef-stew-pouch", "product-beef-stew.html");
    expect(parseProduct(product).brand).toBe("Mountain House");
  });

  it("reads the desktop nutrition panel rather than the duplicated mobile one", () => {
    // The fixture gives the mobile copy a decoy calorie figure (999) to
    // prove the selector doesn't just grab the first match on the page.
    const product = loadProduct("beef-stew-pouch", "product-beef-stew.html");
    expect(parseProduct(product).calories).toBe(420);
  });

  it("comes back with null waterMl and dryWeightGrams for a single-serving item, without throwing", () => {
    const product = loadProduct(
      "beef-stew-pro-pak",
      "product-beef-stew-pro-pak.html",
    );
    const result = parseProduct(product);
    expect(result.calories).toBe(610);
    expect(result.waterMl).toBeNull();
    expect(result.dryWeightGrams).toBeNull();
  });
});

describe("fetchProducts", () => {
  it("filters by tag before fetching detail pages, then parses only the survivors", async () => {
    const fetchImpl = mock(async (url: string) => {
      if (url.includes("/products.json")) {
        return new Response(JSON.stringify(fixture));
      }
      if (url.includes("mexican-style-adobo-rice-chicken-pro-pak")) {
        // Out of stock, but still untagged -- reuses the beef-stew-pro-pak
        // detail-page fixture since only the handle survives into the
        // assertion below, not the parsed content.
        return new Response(loadHtml("product-beef-stew-pro-pak.html"));
      }
      if (url.includes("beef-stew-pro-pak")) {
        return new Response(loadHtml("product-beef-stew-pro-pak.html"));
      }
      if (url.includes("beef-stew-pouch")) {
        return new Response(loadHtml("product-beef-stew.html"));
      }
      throw new Error(`Unexpected fetch during test: ${url}`);
    });

    const result = await fetchProducts(fetchImpl as unknown as typeof fetch);

    expect(result.map((p) => p.handle).sort()).toEqual([
      "beef-stew-pouch",
      "beef-stew-pro-pak",
      "mexican-style-adobo-rice-chicken-pro-pak",
    ]);
    // 1 listing page (7 products < the 250 page size, so no second page) + a
    // detail-page fetch for only the 3 survivors -- the other 4 tagged
    // fixture products must never trigger a request.
    expect(fetchImpl).toHaveBeenCalledTimes(4);
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

describe("mountainHouseScraper.trackedFields", () => {
  it("excludes waterMl, since the vendor never publishes it", () => {
    // Prevents run-vendor-import's systemic-failure detector from alerting
    // admins every single night for a field this vendor structurally never
    // supplies.
    expect(mountainHouseScraper.trackedFields).not.toContain("waterMl");
    expect(mountainHouseScraper.trackedFields).toEqual([
      "brand",
      "calories",
      "dryWeightGrams",
      "imageId",
    ]);
  });
});
