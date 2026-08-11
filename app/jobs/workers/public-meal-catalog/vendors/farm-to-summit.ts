import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";

const STORE_BASE_URL = "https://farmtosummit.com";
export const SOURCE_VENDOR = "farm_to_summit";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's "My Store" on the Gift Card product (already excluded
// by INCLUDED_PRODUCT_TYPE below), but every product this scraper produces
// is Farm To Summit's own by construction anyway, same reasoning as Peak
// Refuel's hardcoded brand.
const BRAND_NAME = "Farm To Summit";
const PAGE_SIZE = 250;

// Instant lattes ("Latte"), apparel/hats/totes ("Camp Store" or empty), the
// build-your-own bundle ("product"), and the gift card (empty) share the
// storefront but aren't a single dehydrated meal -- confirmed live "meal" is
// the only product_type covering individually sold trail meals.
const INCLUDED_PRODUCT_TYPE = "meal";

interface FarmToSummitVariant {
  available: boolean;
  requires_shipping: boolean;
  grams: number;
}

export interface FarmToSummitProduct extends Omit<ShopifyProduct, "variants"> {
  variants: FarmToSummitVariant[];
}

// Deliberately doesn't exclude a meal just because every variant is
// currently unavailable on Farm To Summit's own site -- a user may already
// own it from a prior restock, or be able to source it elsewhere, so it
// stays importable rather than disappearing from the catalog while sold out.
export function shouldSkip(product: FarmToSummitProduct): boolean {
  return product.product_type !== INCLUDED_PRODUCT_TYPE;
}

// Every single-meal product on the site has exactly one variant (no
// size/flavor picker on these listings), so its shipping weight is read
// straight off rather than searched for by variant title like Good To-Go's
// "Each".
export function parseDryWeightGrams(
  product: FarmToSummitProduct,
): number | null {
  return product.variants[0]?.grams ?? null;
}

export function parseProduct(
  product: FarmToSummitProduct,
): ScrapedPublicMealItem {
  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    // Confirmed live across the whole "meal" catalog (product copy and the
    // detail page) that Farm To Summit never states a calorie figure or a
    // water-quantity amount anywhere in text for its meals -- nutrition
    // facts are only ever baked into a label image. (Lattes' body_html does
    // state calories as text, but lattes are excluded above.) Same reasoning
    // as Nomad Nutrition's systemic gap, so both fields are excluded from
    // `trackedFields` below rather than left to alert on every run.
    calories: null,
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Every field this scraper needs (product type, title, variant weight,
// images) is already in the products.json listing itself -- no per-product
// detail-page fetch needed, same reasoning as Peak Refuel/Nomad Nutrition.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<FarmToSummitProduct[]> {
  return fetchShopifyProducts<FarmToSummitProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const farmToSummitScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "dryWeightGrams", "imageId"],
};
