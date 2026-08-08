import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://packitgourmet.com";
export const SOURCE_VENDOR = "packit_gourmet";
// Single-vendor site -- every product this scraper sees is Packit Gourmet's
// own by construction, same reasoning as Peak Refuel's hardcoded brand.
const BRAND_NAME = "Packit Gourmet";

// BigCommerce Stencil has no product feed like Shopify's products.json, so
// membership is determined by which category listing pages we crawl rather
// than by a product_type/tag field. These four cover every individually
// sold meal/snack/drink; "meal-bundles" is deliberately excluded -- it's
// multi-product packs, not a single catalog item (confirmed live: crawling
// it only adds two bundle SKUs beyond what these four already cover).
const CATEGORY_PATHS = [
  "/trail-meals/breakfasts",
  "/trail-meals/desserts/",
  "/trail-meals/entrees/",
  "/trail-meals/extras/",
];

export interface PackitGourmetProduct {
  sourceProductId: string;
  url: string;
  html: string;
}

interface ProductRef {
  sourceProductId: string;
  url: string;
}

function parseListingPage(html: string): ProductRef[] {
  const $ = cheerio.load(html);
  const refs: ProductRef[] = [];

  $("article.card[data-test]").each((_, el) => {
    const dataTest = $(el).attr("data-test");
    const href = $(el).find("a.card-figure__link").attr("href");
    const sourceProductId = dataTest?.replace(/^card-/, "");
    if (sourceProductId && href) {
      refs.push({ sourceProductId, url: href });
    }
  });

  return refs;
}

// Out-of-stock is only exposed on the product detail page itself (a meta
// tag), not reliably on every listing card, so this is checked here rather
// than during the listing crawl.
export function shouldSkip(product: PackitGourmetProduct): boolean {
  const $ = cheerio.load(product.html);
  return $('meta[property="og:availability"]').attr("content") === "oos";
}

// The "About" bullet list (calories/net weight) and "Instructions" steps
// (water) live together in .tab-about-container; scoping to it keeps user
// review text -- which can freely mention unrelated quantities of water or
// calories -- out of the parsed fields.
function aboutText($: cheerio.CheerioAPI): string {
  return $(".tab-about-container").text();
}

export function parseCalories(aboutText: string): number | null {
  const match = aboutText.match(/([\d,]+)\s*calories/i);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

// Unlike Peak Refuel, Packit Gourmet states the water quantity as an
// oz/ml pair directly ("(12 oz / 355 ml)"), so the ml figure is read off
// rather than converted from a cup/oz measurement.
const WATER_ML_PATTERN =
  /\(\s*[\d.]+\s*oz\s*\/\s*([\d.]+)\s*ml\s*\)[^.]*?\bwater\b/i;

export function parseWaterMl(aboutText: string): number | null {
  const match = aboutText.match(WATER_ML_PATTERN);
  return match ? Math.round(Number.parseFloat(match[1]!)) : null;
}

// Grams are stated directly ("5.4 oz | 152 g"), so no unit conversion is
// needed. Matches both "Meal Net Weight" (single items) and "Total Net
// Weight" (multi-item packs like the Happy Hour Snack Pack).
const NET_WEIGHT_PATTERN = /Net Weight:?\s*[\d.]+\s*oz\s*\|\s*([\d.]+)\s*g\b/i;

export function parseDryWeightGrams(aboutText: string): number | null {
  const match = aboutText.match(NET_WEIGHT_PATTERN);
  return match ? Math.round(Number.parseFloat(match[1]!)) : null;
}

// The site's own og:image is whichever photo happens to be uploaded first,
// usually a close-up of the cooked food rather than the product packaging.
// The packaging shot is a separate gallery image, named inconsistently
// across products -- "_MealPouch", or "_Package"/"_Packaging"
// (confirmed live across the full catalog) -- but when none of those
// naming conventions match, it's reliably the *second* image in the
// product's own gallery (right after the food close-up), so that's the
// fallback before giving up and using og:image.
const PACKAGING_IMAGE_NAME_PATTERN = /mealpouch|packag/i;

export function selectImageUrl($: cheerio.CheerioAPI): string | null {
  // Scoped to the product's own thumbnail gallery rather than searched
  // page-wide -- the "similar products" carousel elsewhere on the page can
  // contain another product's packaging image matching this same pattern.
  const galleryUrls = $("a.productView-thumbnail-link")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((href): href is string => Boolean(href));

  const packagingMatch = galleryUrls.find((url) =>
    PACKAGING_IMAGE_NAME_PATTERN.test(url),
  );
  if (packagingMatch) {
    return packagingMatch;
  }

  if (galleryUrls.length >= 2) {
    return galleryUrls[1]!;
  }

  return $('meta[property="og:image"]').attr("content") ?? null;
}

export function parseProduct(
  product: PackitGourmetProduct,
): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);
  const text = aboutText($);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: product.sourceProductId,
    sourceUrl: product.url,
    name: $("h1.productView-title").text().trim(),
    brand: BRAND_NAME,
    calories: parseCalories(text),
    waterMl: parseWaterMl(text),
    dryWeightGrams: parseDryWeightGrams(text),
    imageUrl: selectImageUrl($),
  };
}

// Category listing pages page via ?page=N, 1-indexed; a page past the last
// one renders with zero product cards (confirmed live -- it's a 200, not a
// 404 or redirect). Product refs are deduped by ID since the same product
// can appear in more than one category listing.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<PackitGourmetProduct[]> {
  const refsById = new Map<string, ProductRef>();

  for (const categoryPath of CATEGORY_PATHS) {
    for (let page = 1; ; page++) {
      const res = await fetchImpl(
        `${STORE_BASE_URL}${categoryPath}?page=${page}`,
      );
      if (!res.ok) {
        throw new Error(
          `Packit Gourmet category listing returned ${res.status} for ${categoryPath} page ${page}`,
        );
      }

      const refs = parseListingPage(await res.text());
      if (refs.length === 0) {
        break;
      }

      for (const ref of refs) {
        refsById.set(ref.sourceProductId, ref);
      }
    }
  }

  const products: PackitGourmetProduct[] = [];
  for (const { sourceProductId, url } of refsById.values()) {
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Packit Gourmet product page returned ${res.status} for ${url}`,
      );
    }
    products.push({ sourceProductId, url, html: await res.text() });
  }

  return products;
}

export const packitGourmetScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
