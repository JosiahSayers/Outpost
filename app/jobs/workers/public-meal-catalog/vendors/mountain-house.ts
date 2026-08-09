import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://mountainhouse.com";
export const SOURCE_VENDOR = "mountain_house";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's "Oregon Freeze Dry" (the parent company) on every
// product, never "Mountain House". Same reasoning as Peak Refuel's hardcoded
// brand.
const BRAND_NAME = "Mountain House";
const PAGE_SIZE = 250;

// No product_type allow-list is needed here (unlike Peak Refuel) -- confirmed
// live against the full catalog that every bundle, multi-day emergency kit,
// "Build Your Own Kit" builder product, canned "Just in Case" item, and
// duplicate "2-Pack" listing carries at least one of these tags, and no
// genuine single-serving meal/dessert pouch does.
const EXCLUDED_TAGS = new Set(["Kit", "Bucket", "Can", "2-Pack"]);

export interface MountainHouseProduct extends ShopifyProduct {
  html: string;
}

export function shouldSkip(product: ShopifyProduct): boolean {
  if (product.tags.some((tag) => EXCLUDED_TAGS.has(tag))) {
    return true;
  }
  return product.variants.every((variant) => !variant.available);
}

// Nutrition facts (calories, serving size/weight) only exist on the product
// detail page, rendered from a separate app block -- not in products.json
// like Peak Refuel, and not in body_html either. The page renders this panel
// twice (desktop + mobile tabs, identical content); the mobile one's classes
// are prefixed "-mobile" so this selector only matches the desktop copy.
function nutritionText($: cheerio.CheerioAPI): string {
  return $(".product-tabs__panel-table").first().text();
}

// The site never inserts whitespace between adjacent table cells/elements in
// its rendered markup (confirmed live: cheerio's .text() yields
// "...Pouch420Total Fat..." with no gap), so this doesn't require a
// boundary space before the digits.
const CALORIES_PATTERN = /Calories\/Per Pouch\s*([\d,]+)/i;

export function parseCalories(text: string): number | null {
  const match = text.match(CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

// Mountain House doesn't state total net weight directly. Multi-serving
// pouches state "N servings per container" and "Serving size ... (Xg) dry
// mix" though, and net weight is by definition servings x per-serving grams
// (confirmed against several products: the resulting totals line up with the
// freeze-dried entree weight range other vendors state directly). Pro-Pak and
// other single-serving items instead say "Serving size 1 package" with no
// gram figure at all, so this comes back null for those -- a per-product
// gap, not a systemic one.
const DRY_WEIGHT_PATTERN =
  /(\d+)\s*servings per container[\s\S]*?\(([\d.]+)\s*g\)\s*dry mix/i;

export function parseDryWeightGrams(text: string): number | null {
  const match = text.match(DRY_WEIGHT_PATTERN);
  if (!match) {
    return null;
  }
  const servings = Number.parseInt(match[1]!, 10);
  const gramsPerServing = Number.parseFloat(match[2]!);
  return Math.round(servings * gramsPerServing);
}

export function parseProduct(
  product: MountainHouseProduct,
): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);
  const text = nutritionText($);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(text),
    // Confirmed live across every product template (multi-serving pouches,
    // single-serving Pro-Paks, Military cans) that Mountain House never
    // publishes a water-quantity figure in text anywhere on the product
    // page -- just "add water" with no amount. Unlike calories/dryWeight,
    // this isn't a per-product gap, so it's excluded from `trackedFields`
    // below rather than left to alert on every run.
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(text),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Unlike Peak Refuel, the fields needed to decide inclusion
// (product_type/tags/availability) are already in the products.json feed, so
// filtering happens before fetching each product's detail page -- fetching
// all ~110 listings just to discard more than half of them for their
// nutrition panel would be pure waste.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<MountainHouseProduct[]> {
  const listing = await fetchShopifyProducts(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: MountainHouseProduct[] = [];
  for (const item of listing) {
    if (shouldSkip(item)) {
      continue;
    }

    const url = `${STORE_BASE_URL}/products/${item.handle}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Mountain House product page returned ${res.status} for ${url}`,
      );
    }

    products.push({ ...item, html: await res.text() });
  }

  return products;
}

export const mountainHouseScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "calories", "dryWeightGrams", "imageId"],
};
