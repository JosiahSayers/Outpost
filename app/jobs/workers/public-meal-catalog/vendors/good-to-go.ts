import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://goodto-go.com";
export const SOURCE_VENDOR = "good_to_go";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live the sole product carrying a different value ("Good to Go
// D2c", on the Gift Cards product) is already excluded by
// ALLOWED_PRODUCT_TYPES below, but every product this scraper produces is
// Good To-Go's own by construction anyway, same reasoning as Peak Refuel's
// hardcoded brand.
const BRAND_NAME = "Good To-Go";
const PAGE_SIZE = 250;

// "Food Kit", "Weekender", and "Emergency Meal Kit" are multi-day/multi-meal
// bundles, and "Gift Cards" isn't food -- confirmed live none of those is a
// single catalog item. "Cup" and "Cup-v2" both cover genuine single-serving
// cup meals (Cup-v2 is a newer template some products have migrated to, but
// not all).
const ALLOWED_PRODUCT_TYPES = new Set(["Entree", "Breakfast", "Cup", "Cup-v2"]);
// The "Cup" product_type also contains two multi-item variety packs
// ("Variety 8-Pack (Pad Thai + Pasta)", "Variety 8-Pack of Cups") that carry
// no distinguishing tag from a genuine single cup -- confirmed live every
// legitimate single meal's title is just the dish name, so title is the only
// signal that catches them.
const VARIETY_TITLE_PATTERN = /variety/i;

interface GoodToGoVariant {
  title: string;
  available: boolean;
  requires_shipping: boolean;
  // Shopify's per-variant shipping weight in grams -- confirmed live this
  // lines up with the single-serving pouch weight other vendors state as
  // "Net Weight" in their product copy, which Good To-Go never does as text
  // anywhere on the page (only baked into the nutrition-label image).
  grams: number;
}

export interface GoodToGoProduct extends Omit<ShopifyProduct, "variants"> {
  variants: GoodToGoVariant[];
}

export function shouldSkip(product: GoodToGoProduct): boolean {
  if (!ALLOWED_PRODUCT_TYPES.has(product.product_type)) {
    return true;
  }
  if (VARIETY_TITLE_PATTERN.test(product.title)) {
    return true;
  }
  return product.variants.every((variant) => !variant.available);
}

function stripHtml(html: string): string {
  return cheerio.load(html).text();
}

// Calories only appear as a number when a product's FAQ copy happens to call
// it out ("580 cals per serving", "With 490 calories and 16g of protein") --
// confirmed live most products' copy never states a figure at all (it's only
// ever in the nutrition-label image), so this is a per-product gap, not a
// systemic one. Matches "cals"/"calories" but not the "calorie-dense"
// adjective some copy uses instead, which has no leading number.
const CALORIES_PATTERN = /([\d,]+)\s*cal(?:ories|s)\b/i;

export function parseCalories(bodyText: string): number | null {
  const match = bodyText.match(CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

// Always stated as an mL figure directly in the rehydration step's
// parenthetical ("Add a little more than one cup (250ML) of BOILING
// water") -- confirmed live across the catalog, no cup/oz-only fallback
// needed like Peak Refuel.
const WATER_ML_PATTERN = /\(([\d.]+)\s*mL\)/i;

export function parseWaterMl(bodyText: string): number | null {
  const match = bodyText.match(WATER_ML_PATTERN);
  return match ? Math.round(Number.parseFloat(match[1]!)) : null;
}

export function parseDryWeightGrams(product: GoodToGoProduct): number | null {
  const eachVariant = product.variants.find(
    (variant) => variant.title === "Each",
  );
  return eachVariant?.grams ?? null;
}

export function parseProduct(product: GoodToGoProduct): ScrapedPublicMealItem {
  const bodyText = stripHtml(product.body_html);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(bodyText),
    waterMl: parseWaterMl(bodyText),
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Every field this scraper needs (nutrition/prep copy, per-variant weight,
// images) is already in the products.json listing itself -- no per-product
// detail-page fetch needed, unlike Backpacker's Pantry/Mountain House.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<GoodToGoProduct[]> {
  return fetchShopifyProducts<GoodToGoProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const goodToGoScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
