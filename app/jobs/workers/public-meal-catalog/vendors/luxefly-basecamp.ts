import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";

const STORE_BASE_URL = "https://luxeflybasecamp.com";
export const SOURCE_VENDOR = "luxefly_basecamp";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's inconsistently "Luxefly Basecamp" or "Luxefly Base
// Camp" (with a space) depending on the product, same reasoning as Nomad
// Nutrition's inconsistent vendor field.
const BRAND_NAME = "Luxefly Basecamp";
const PAGE_SIZE = 250;

// Every product on this storefront has an empty `product_type`, so unlike
// every other vendor here, that field can't be used to separate meals from
// the handful of non-meal listings -- confirmed live across the whole
// catalog. Those non-meal listings are caught individually below instead:
// the digital gift card (all variants non-shippable, same convention as
// Peak Refuel), the "merch" tagged Titanium Fork, and the multi-bag
// subscription product (a bundle of 3 bags, not a single catalog item).
const EXCLUDED_TAGS = new Set(["merch"]);
const SUBSCRIPTION_TITLE_PATTERN = /\bsubscription\b/i;

// Product photos have no alt text and no consistent naming convention
// (unlike Packit Gourmet's `_MealPouch`/`_Package` suffix) -- confirmed live
// across the catalog that the first image is the packaging shot for the
// large majority of products, with one confirmed exception
// ("stroganoff_cooked.jpg") whose filename says outright that it's the
// plated dish rather than the pouch.
const COOKED_IMAGE_NAME_PATTERN = /_cooked\b/i;

interface LuxeflyBasecampVariant {
  available: boolean;
  requires_shipping: boolean;
  grams: number;
}

export interface LuxeflyBasecampProduct extends Omit<
  ShopifyProduct,
  "variants"
> {
  variants: LuxeflyBasecampVariant[];
}

// Deliberately doesn't exclude a meal just because every variant is
// currently unavailable on Luxefly Basecamp's own site -- a user may already
// own it from a prior restock, or be able to source it elsewhere, so it
// stays importable rather than disappearing from the catalog while sold out.
export function shouldSkip(product: LuxeflyBasecampProduct): boolean {
  if (product.tags.some((tag) => EXCLUDED_TAGS.has(tag))) {
    return true;
  }
  if (SUBSCRIPTION_TITLE_PATTERN.test(product.title)) {
    return true;
  }
  return product.variants.every((variant) => !variant.requires_shipping);
}

// Meals offering both an "individual" and a "serves 2" size are still a
// single catalog item with two variants -- but confirmed live every such
// product records the *same* shipping weight on both variants regardless of
// serving size, so there's no need to search for a specific variant by
// title like Good To-Go's "Each"; the first variant's weight is always
// correct.
export function parseDryWeightGrams(
  product: LuxeflyBasecampProduct,
): number | null {
  return product.variants[0]?.grams ?? null;
}

export function selectImageUrl(product: LuxeflyBasecampProduct): string | null {
  const packagingImage = product.images.find(
    (image) => !COOKED_IMAGE_NAME_PATTERN.test(image.src),
  );
  return (packagingImage ?? product.images[0])?.src ?? null;
}

export function parseProduct(
  product: LuxeflyBasecampProduct,
): ScrapedPublicMealItem {
  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    // Confirmed live across the whole catalog (product descriptions and the
    // site's own prep-instructions copy) that Luxefly Basecamp never states
    // a calorie figure or a water-quantity amount anywhere in text -- prep
    // copy just says "pour boiling water straight into the bag" with no
    // measurement. Systemic gap, same reasoning as Nomad Nutrition/Farm To
    // Summit, so both fields are excluded from `trackedFields` below rather
    // than left to alert on every run.
    calories: null,
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: selectImageUrl(product),
  };
}

// Every field this scraper needs (tags, title, variant weight, images) is
// already in the products.json listing itself -- no per-product detail-page
// fetch needed, same reasoning as Peak Refuel/Nomad Nutrition.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<LuxeflyBasecampProduct[]> {
  return fetchShopifyProducts<LuxeflyBasecampProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const luxeflyBasecampScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "dryWeightGrams", "imageId"],
};
