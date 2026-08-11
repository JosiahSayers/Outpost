import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://angrypikafood.com";
export const SOURCE_VENDOR = "angry_pika";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's "Angry Pika Food Co." on newer products but "Alpen
// Fuel" (the brand's former name) on products that predate the rename, with
// no other signal distinguishing them. Every product this scraper sees is
// Angry Pika's own by construction, same reasoning as Peak Refuel's
// hardcoded brand.
const BRAND_NAME = "Angry Pika Food Co.";
const PAGE_SIZE = 250;

// "Meal" covers the granola breakfasts, "Snack" the trail cookies -- both
// are single-serving catalog items to import. Everything else
// (Gift Cards, Accessories, and apparel/mugs which carry an empty
// product_type) is confirmed live to be non-food.
const ALLOWED_PRODUCT_TYPES = new Set(["Meal", "Snack"]);
// "Granola Variety Pack" and "Trail Cookie Variety Pack" each bundle several
// already-individually-sold flavors into one SKU -- confirmed live their
// combined weight is just the sum of the parts they contain, so they're
// multi-product bundles, not single catalog items, same reasoning as Good
// To-Go's variety-pack exclusion.
const VARIETY_TITLE_PATTERN = /variety pack/i;

interface AngryPikaVariant {
  available: boolean;
  requires_shipping: boolean;
  // Shopify's per-variant shipping weight in grams -- read directly rather
  // than parsed from the body copy's "WEIGHT - 4.4oz" bullet, which isn't
  // present on every product (e.g. the trail cookies never state it).
  grams: number;
}

export interface AngryPikaProduct extends Omit<ShopifyProduct, "variants"> {
  variants: AngryPikaVariant[];
}

export function shouldSkip(product: AngryPikaProduct): boolean {
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

// Always stated as "CALORIES - NNN" in the bullet list, sometimes trailing
// into "NNN calories per pouch!" -- confirmed live across both meals and
// cookies. The variety packs state a range ("CALORIES - 630-770 calories")
// instead of a single figure, but those are already excluded by
// VARIETY_TITLE_PATTERN above.
const CALORIES_PATTERN = /CALORIES\s*-\s*([\d,]+)/i;

export function parseCalories(bodyText: string): number | null {
  const match = bodyText.match(CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

const OZ_TO_ML = 29.5735;
// Every granola meal's prep copy states the same "Mix with 4-5oz of hot or
// cold water" range rather than a single figure (confirmed live across the
// whole catalog) -- the midpoint is used rather than picking a bound.
const WATER_OZ_PATTERN = /Mix with\s+([\d.]+)(?:\s*-\s*([\d.]+))?\s*oz/i;

export function parseWaterMl(bodyText: string): number | null {
  const match = bodyText.match(WATER_OZ_PATTERN);
  if (!match) {
    return null;
  }
  const low = Number.parseFloat(match[1]!);
  const high = match[2] ? Number.parseFloat(match[2]) : low;
  return Math.round(((low + high) / 2) * OZ_TO_ML);
}

export function parseDryWeightGrams(product: AngryPikaProduct): number | null {
  return product.variants[0]?.grams ?? null;
}

export function parseProduct(product: AngryPikaProduct): ScrapedPublicMealItem {
  const bodyText = stripHtml(product.body_html);
  // Trail cookies are eaten dry -- confirmed live none of their product
  // copy ever mentions rehydrating with water, unlike every granola meal.
  const isCookie = product.product_type === "Snack";

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(bodyText),
    waterMl: isCookie ? 0 : parseWaterMl(bodyText),
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Every field this scraper needs (nutrition/prep copy, per-variant weight,
// images) is already in the products.json listing itself -- no per-product
// detail-page fetch needed, same reasoning as Good To-Go/Peak Refuel.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<AngryPikaProduct[]> {
  return fetchShopifyProducts<AngryPikaProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );
}

export const angryPikaScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
