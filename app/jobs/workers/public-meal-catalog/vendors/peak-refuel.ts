import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://peakrefuel.com";
export const SOURCE_VENDOR = "peak_refuel";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live that it's "Fast Bundle" on bundle products and "Peak
// Refuel" on individual meals, so trusting it would put the wrong brand on
// part of the catalog. Every product this scraper sees *is* Peak Refuel by
// construction.
const BRAND_NAME = "Peak Refuel";
const PAGE_SIZE = 250;

// Foods only -- confirmed live that Peak Refuel's catalog also contains
// apparel/utensils ("Purchased Finished Goods") and gift cards, both
// unclassifiable as a meal.
const INCLUDED_PRODUCT_TYPES = new Set(["Meals", "Dessert"]);
// `product_type` alone isn't reliable: at least one real bundle
// ("Backcountry Pack", a 14-day/42-meal bundle) is mistagged "Meals". Every
// legitimate bundle carries a "bundle" and/or "packs" tag (confirmed against
// the live catalog, including that mistagged one), and no legitimate single
// meal does, so tags catch what product_type alone misses.
const EXCLUDED_TAGS = new Set(["bundle", "packs"]);

export function shouldSkip(product: ShopifyProduct): boolean {
  if (!INCLUDED_PRODUCT_TYPES.has(product.product_type)) {
    return true;
  }
  if (product.tags.some((tag) => EXCLUDED_TAGS.has(tag))) {
    return true;
  }
  // Every variant non-shippable means a purely digital product (e.g. a gift
  // card) -- confirmed live that "Gift Cards" is mistagged product_type:
  // "Meals" with no other exclusion signal, but its variants all have
  // requires_shipping: false, which no real food item does. General Shopify
  // convention, not a Peak Refuel-specific hack.
  return product.variants.every((variant) => !variant.requires_shipping);
}

function stripHtml(html: string): string {
  return cheerio.load(html).text();
}

export function parseCalories(bodyText: string): number | null {
  const match = bodyText.match(/Calories per Pouch\s*[-–]\s*([\d,]+)/i);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

const OZ_TO_ML = 29.5735;
const CUP_TO_ML = 236.588;

// Vulgar-fraction glyphs Peak Refuel's copy uses in place of "1/3" etc.
const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};
const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

function parseQuantityToken(token: string): number {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token]!;
  if (token.includes("/")) {
    const [n, d] = token.split("/").map(Number);
    return n! / d!;
  }
  return Number.parseFloat(token);
}

// Handles "2", "2/3", "1 1/3" (mixed number), and "1 ⅓" (mixed number with a
// unicode fraction glyph) -- all seen in real product copy.
function parseCupQuantity(raw: string): number {
  return raw
    .trim()
    .split(/\s+/)
    .reduce((total, part) => total + parseQuantityToken(part), 0);
}

// Most precise when a product states the oz equivalent directly --
// "add 2 cups (16 oz) boiling water" -- but roughly half of real Peak Refuel
// product pages only state the cup measurement with no oz parenthetical at
// all ("just add 2/3 cups of water"), so a cup-quantity fallback is needed
// for this field to be usefully populated rather than null on most items.
const OZ_PATTERN = /\(([\d.]+)\s*oz\)\s*(?:of\s*)?(?:boiling|cold)?\s*water/i;
const CUP_PATTERN = new RegExp(
  `add\\s+((?:\\d+\\s+)?(?:\\d+\\/\\d+|[${FRACTION_CHARS}]|\\d+(?:\\.\\d+)?))\\s*cups?\\s+of\\s+(?:boiling\\s+|cold\\s+)?water`,
  "i",
);

export function parseWaterMl(bodyText: string): number | null {
  const ozMatch = bodyText.match(OZ_PATTERN);
  if (ozMatch) {
    return Math.round(Number.parseFloat(ozMatch[1]!) * OZ_TO_ML);
  }

  const cupMatch = bodyText.match(CUP_PATTERN);
  if (cupMatch) {
    return Math.round(parseCupQuantity(cupMatch[1]!) * CUP_TO_ML);
  }

  return null;
}

const OZ_TO_GRAMS = 28.3495;

export function parseDryWeightGrams(bodyText: string): number | null {
  const match = bodyText.match(/Net Weight\s*[-–]\s*([\d.]+)\s*oz/i);
  return match ? Math.round(Number.parseFloat(match[1]!) * OZ_TO_GRAMS) : null;
}

export function parseProduct(product: ShopifyProduct): ScrapedPublicMealItem {
  const bodyText = stripHtml(product.body_html);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(bodyText),
    waterMl: parseWaterMl(bodyText),
    dryWeightGrams: parseDryWeightGrams(bodyText),
    imageUrl: product.images[0]?.src ?? null,
  };
}

export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<ShopifyProduct[]> {
  return fetchShopifyProducts(STORE_BASE_URL, fetchImpl, PAGE_SIZE);
}

export const peakRefuelScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
