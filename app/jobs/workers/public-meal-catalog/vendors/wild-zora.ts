import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://wildzora.com";
// Scoped to the "Meals To Go" collection (BTP-120) rather than the full
// products.json feed -- the wider catalog also carries soups, cereals,
// noodles, wholesale-only listings, and a gift card, none of which are the
// single-serve freeze-dried meal line this ingest targets. Shopify serves a
// paginated products.json for any collection at this same path.
const COLLECTION_PATH = "/collections/meals-to-go";
export const SOURCE_VENDOR = "wild_zora";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's "PMTG" on one multipack (excluded via the "multipack"
// tag below) and "Wild Zora" everywhere else. Every product this scraper
// keeps is Wild Zora's own by construction, same reasoning as Peak Refuel's
// hardcoded brand.
const BRAND_NAME = "Wild Zora";
const PAGE_SIZE = 250;

// Every multi-meal bundle in the collection (e.g. "AIP Meals 4-Pack",
// "Savory Variety 4-Pack", "All Flavors Variety 7-Pack") carries this tag,
// and no single-serve meal does (confirmed live against the full
// collection) -- so it's the only exclusion signal needed.
const EXCLUDED_TAG = "multipack";

export function shouldSkip(product: ShopifyProduct): boolean {
  return product.tags.includes(EXCLUDED_TAG);
}

function stripHtml(html: string): string {
  return cheerio.load(html).text();
}

// Net weight is stated directly, but in two different orders depending on
// the product line: "Net (dry) weight 3oz/85g" for the core Meals To Go
// line, vs. "3oz/86g dry weight" for the Quinoa Meals line (confirmed live
// across both). Grams are read off directly, no unit conversion needed.
const DRY_WEIGHT_PATTERN =
  /net\s+(?:dry\s+)?weight:?\s*[\d.]+\s*oz\/([\d.]+)\s*g|[\d.]+\s*oz\/([\d.]+)\s*g\s*dry\s*weight/i;

export function parseDryWeightGrams(bodyText: string): number | null {
  const match = bodyText.match(DRY_WEIGHT_PATTERN);
  if (!match) {
    return null;
  }
  const grams = match[1] ?? match[2];
  return grams ? Math.round(Number.parseFloat(grams)) : null;
}

export function parseProduct(product: ShopifyProduct): ScrapedPublicMealItem {
  const bodyText = stripHtml(product.body_html);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    // Confirmed live across every product template in the collection
    // (single-serve meals and Quinoa Meals alike) that calorie counts and
    // water-rehydration quantities are only ever published as part of the
    // "Nutritional Facts" product image, never as page text -- unlike
    // dryWeightGrams, this isn't a per-product gap, so both are excluded
    // from `trackedFields` below rather than left to alert on every run.
    calories: null,
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(bodyText),
    imageUrl: product.images[0]?.src ?? null,
  };
}

export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyProduct[]> {
  return fetchShopifyProducts(
    `${STORE_BASE_URL}${COLLECTION_PATH}`,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const wildZoraScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "dryWeightGrams", "imageId"],
};
