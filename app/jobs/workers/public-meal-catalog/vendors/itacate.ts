import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";

const STORE_BASE_URL = "https://itacatefoods.com";
export const SOURCE_VENDOR = "itacate";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's consistently "Itacate Foods" across the catalog, but
// every product this scraper sees is Itacate's own by construction anyway,
// same reasoning as Peak Refuel's hardcoded brand.
const BRAND_NAME = "Itacate Foods";
const PAGE_SIZE = 250;

// The gift card shares the storefront but isn't food -- confirmed live
// "Backpacking Food" is the only product_type covering individually sold
// meals (the gift card's is an empty string).
const INCLUDED_PRODUCT_TYPE = "Backpacking Food";

interface ItacateVariant {
  available: boolean;
  requires_shipping: boolean;
  grams: number;
}

export interface ItacateProduct extends Omit<ShopifyProduct, "variants"> {
  variants: ItacateVariant[];
}

export function shouldSkip(product: ItacateProduct): boolean {
  if (product.product_type !== INCLUDED_PRODUCT_TYPE) {
    return true;
  }
  return product.variants.every((variant) => !variant.available);
}

// Every meal states its nutrition facts as a single pipe-delimited line in
// its description -- "Single Serving | Not Spicy | Vegan | 24g Protein |
// 490 Cal | 4.0 oz" -- confirmed live across the whole catalog. Matches only
// "Cal" (not "Calories"/"California") since that's the only form used.
const CALORIES_PATTERN = /([\d,]+)\s*Cal\b/i;

export function parseCalories(bodyText: string): number | null {
  const match = bodyText.match(CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

// Every single-meal product on the site has exactly one variant (no
// size/flavor picker on these listings), so its shipping weight is read
// straight off rather than searched for by variant title like Good To-Go's
// "Each".
export function parseDryWeightGrams(product: ItacateProduct): number | null {
  return product.variants[0]?.grams ?? null;
}

export function parseProduct(product: ItacateProduct): ScrapedPublicMealItem {
  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(product.body_html),
    // Confirmed live across the whole catalog (product descriptions and the
    // product page itself) that Itacate never states a water-quantity
    // amount anywhere in text -- copy only ever says "just add water" with
    // no measurement. Systemic gap, same reasoning as Farm To Summit/Nomad
    // Nutrition, so waterMl is excluded from `trackedFields` below rather
    // than left to alert on every run.
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Every field this scraper needs (product type, title, nutrition copy,
// variant weight, images) is already in the products.json listing itself --
// no per-product detail-page fetch needed, same reasoning as Peak
// Refuel/Nomad Nutrition.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<ItacateProduct[]> {
  return fetchShopifyProducts<ItacateProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const itacateScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "calories", "dryWeightGrams", "imageId"],
};
