import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";

const STORE_BASE_URL = "https://www.nomadnutrition.co";
export const SOURCE_VENDOR = "nomad_nutrition";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's inconsistently "Nomad Nutrition" or "NomadNutrition"
// (no space) depending on the product, so trusting it would put an
// inconsistent brand string on part of the catalog. Every product this
// scraper sees is Nomad Nutrition's own by construction, same reasoning as
// Peak Refuel's hardcoded brand.
const BRAND_NAME = "Nomad Nutrition";
const PAGE_SIZE = 250;

// Gift cards and branded apparel/swag share the storefront but aren't food.
const INCLUDED_PRODUCT_TYPE = "Food";
// Multi-meal bundles ("Breakfast Pack", "Mega Pack - 18 Meals", "Sampler
// Pack - 9 x half portions", "Power Pack - 9 x Single Serving") and
// multi-serving refill bags ("5 serving Bulk Bag - 560g", "10 Serving Bulk
// Bag - 1120 grams") aren't a single catalog item -- confirmed live every
// one of those (and only those) has "pack" or "bulk bag" in its title.
const BUNDLE_TITLE_PATTERN = /\bpack\b|bulk bag/i;

interface NomadNutritionVariant {
  available: boolean;
  requires_shipping: boolean;
  grams: number;
}

export interface NomadNutritionProduct extends Omit<
  ShopifyProduct,
  "variants"
> {
  variants: NomadNutritionVariant[];
}

// Deliberately doesn't exclude a meal just because every variant is
// currently unavailable on Nomad Nutrition's own site -- a user may already
// own it from a prior restock, or be able to source it elsewhere, so it
// stays importable rather than disappearing from the catalog while sold out.
export function shouldSkip(product: NomadNutritionProduct): boolean {
  if (product.product_type !== INCLUDED_PRODUCT_TYPE) {
    return true;
  }
  return BUNDLE_TITLE_PATTERN.test(product.title);
}

// Every single-meal product on the site has exactly one variant (there's no
// size/flavor picker on these listings, unlike the bulk bags this scraper
// excludes), so its shipping weight is read straight off rather than
// searched for by variant title like Good To-Go's "Each".
export function parseDryWeightGrams(
  product: NomadNutritionProduct,
): number | null {
  return product.variants[0]?.grams ?? null;
}

export function parseProduct(
  product: NomadNutritionProduct,
): ScrapedPublicMealItem {
  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    // Confirmed live across the whole catalog (product copy, the
    // "Extremely Easy To Prepare" instructions block, and the nutrition
    // panel) that Nomad Nutrition never states a calorie figure or a
    // water-quantity amount anywhere in text -- prep instructions just say
    // "pour boiling hot water in" with no measurement. Unlike Good To-Go's
    // per-product calorie gap, this is systemic, so both fields are
    // excluded from `trackedFields` below rather than left to alert on
    // every run.
    calories: null,
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Every field this scraper needs (product type, title, variant weight,
// images) is already in the products.json listing itself -- no per-product
// detail-page fetch needed, same reasoning as Peak Refuel.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<NomadNutritionProduct[]> {
  return fetchShopifyProducts<NomadNutritionProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const nomadNutritionScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "dryWeightGrams", "imageId"],
};
