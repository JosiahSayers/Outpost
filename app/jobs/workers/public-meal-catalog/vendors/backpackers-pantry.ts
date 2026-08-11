import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://backpackerspantry.com";
export const SOURCE_VENDOR = "backpackers_pantry";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's inconsistently "Backpacker's Pantry" or the internal
// "backpackerspantry-dev" store handle depending on the product, so trusting
// it would put the wrong brand on part of the catalog. Every product this
// scraper sees is Backpacker's Pantry by construction, same reasoning as
// Peak Refuel's hardcoded brand.
const BRAND_NAME = "Backpacker's Pantry";
const PAGE_SIZE = 250;

// Gift cards and branded gear/apparel share the storefront but aren't food.
const INCLUDED_PRODUCT_TYPE = "Food";
// Multi-day emergency survival kits and the dessert bundle are multi-product
// bundles, not a single catalog item -- confirmed live that every one of
// those (and only those) carries this tag, no genuine single meal does.
const EXCLUDED_TAG = "Collection_Emergency";

export interface BackpackersPantryProduct extends ShopifyProduct {
  html: string;
}

// Deliberately doesn't exclude a product just because every variant is
// currently unavailable on Backpacker's Pantry's own site -- a user may
// already own it from a prior restock, or be able to source it elsewhere,
// so it stays importable rather than disappearing from the catalog while
// sold out.
export function shouldSkip(product: ShopifyProduct): boolean {
  if (product.product_type !== INCLUDED_PRODUCT_TYPE) {
    return true;
  }
  return product.tags.includes(EXCLUDED_TAG);
}

// Calories/weight are published as a plain bullet list right in the product
// description (products.json body_html), so unlike the water figure below
// they don't need the per-product detail-page fetch.
function descriptionText(bodyHtml: string): string {
  return cheerio.load(bodyHtml).text();
}

export function parseCalories(text: string): number | null {
  const match = text.match(/Calories:\s*([\d,]+)/i);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

const OZ_TO_GRAMS = 28.3495;

// Always stated in oz ("Weight: 6.2 oz") -- confirmed live across the whole
// catalog, no lb figures to handle.
export function parseDryWeightGrams(text: string): number | null {
  const match = text.match(/Weight:\s*([\d.]+)\s*oz/i);
  return match ? Math.round(Number.parseFloat(match[1]!) * OZ_TO_GRAMS) : null;
}

// The water quantity lives in the "Preparation & Storage" collapsible panel
// on the product detail page (a metafield), not in the products.json feed --
// scoped to that specific panel, found via its trigger button's label,
// rather than searched page-wide, since an "Ingredients" panel or a customer
// review can otherwise contain an unrelated number in the same shape.
function preparationText($: cheerio.CheerioAPI): string {
  const trigger = $(".collapsible-trigger-btn")
    .filter((_, el) => $(el).text().includes("Preparation & Storage"))
    .first();
  const targetId = trigger.attr("aria-controls");
  return targetId ? $(`#${targetId}`).text() : "";
}

// Stated directly as an mL figure in the boiling/cold-water step's
// parenthetical ("Add 1 3⁄4 cups (420mL) of boiling water"), so read off
// directly rather than converted from the cup measurement.
const WATER_ML_PATTERN = /\(([\d.]+)\s*mL\)/i;

export function parseWaterMl(text: string): number | null {
  const match = text.match(WATER_ML_PATTERN);
  return match ? Math.round(Number.parseFloat(match[1]!)) : null;
}

export function parseProduct(
  product: BackpackersPantryProduct,
): ScrapedPublicMealItem {
  const text = descriptionText(product.body_html);
  const $ = cheerio.load(product.html);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(text),
    waterMl: parseWaterMl(preparationText($)),
    dryWeightGrams: parseDryWeightGrams(text),
    imageUrl: product.images[0]?.src ?? null,
  };
}

// Filtering happens against the products.json listing before fetching each
// survivor's detail page -- fetching every listing just to discard gift
// cards/gear/bundles for their prep instructions would be pure waste, same
// reasoning as Mountain House.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<BackpackersPantryProduct[]> {
  const listing = await fetchShopifyProducts(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: BackpackersPantryProduct[] = [];
  for (const item of listing) {
    if (shouldSkip(item)) {
      continue;
    }

    const url = `${STORE_BASE_URL}/products/${item.handle}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Backpacker's Pantry product page returned ${res.status} for ${url}`,
      );
    }

    products.push({ ...item, html: await res.text() });
  }

  return products;
}

export const backpackersPantryScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
