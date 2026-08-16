import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://ubufoods.com";
// Scoped to the "Hiker's Hummus" collection (BTP-129) rather than the full
// products.json feed -- the wider catalog is mostly chili oil and other
// condiments, not backpacking food. Shopify serves a paginated products.json
// for any collection at this same path.
const COLLECTION_PATH = "/collections/hiker-s-hummus";
export const SOURCE_VENDOR = "ubu_foods";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's "uBu" on the hummus product itself but "uBu Foods" on
// the collection's other listings, same reasoning as Luxefly Basecamp's
// inconsistent vendor field.
const BRAND_NAME = "uBu Foods";
const PAGE_SIZE = 250;

// The only food item in this collection -- everything else (Kuksa Mug,
// Hiker's Hummus Gift Set bundling a mug with hummus) lacks this tag,
// confirmed live across the whole collection.
const FOOD_TAG = "freeze dried";

// The "Starter Pack" variant mixes three different flavors in one set, so it
// has no single-flavor nutrition entry of its own -- excluded the same way
// Greenbelly excludes its "Variety" flavor option.
const STARTER_PACK_PATTERN = /^starter pack/i;
// Flavor option values carry a "(4-Pack)"/"(N-Pack)" suffix that doesn't
// appear in either the nutrition-tab text or the catalog name -- stripped for
// both matching and display, same reasoning as Greenbelly's " | <qualifier>"
// suffix strip.
const PACK_SUFFIX_PATTERN = /\s*\(\d+-pack\)\s*$/i;

interface UbuFoodsVariant {
  id: number;
  option1: string | null;
  available: boolean;
  requires_shipping: boolean;
  featured_image: { src: string } | null;
}

interface UbuFoodsShopifyProduct extends Omit<ShopifyProduct, "variants"> {
  variants: UbuFoodsVariant[];
}

// One entry per flavor rather than per Shopify product -- the single product
// in this collection bundles three hummus flavors (plus the excluded Starter
// Pack) into one Shopify listing, but each flavor has its own nutrition facts
// and is sold as its own SKU, same reasoning as Greenbelly.
export interface UbuFoodsProduct {
  sourceProductId: string;
  sourceUrl: string;
  productTitle: string;
  flavor: string;
  imageUrl: string | null;
  html: string;
}

function cleanFlavorName(flavor: string): string {
  return flavor.replace(PACK_SUFFIX_PATTERN, "").trim();
}

// The vendor's own product title carries a redundant "uBu " brand prefix and
// a "(4-pack)" pack-size suffix (confirmed live: "uBu Hiker's Hummus
// (4-pack)") -- both stripped since `brand` already carries the former and
// every catalog item from this vendor is a 4-pack, same reasoning as
// Greenbelly's "(NEW!)" prefix strip.
const BRAND_PREFIX_PATTERN = /^uBu\s+/i;

function cleanProductTitle(title: string): string {
  return title
    .replace(BRAND_PREFIX_PATTERN, "")
    .replace(PACK_SUFFIX_PATTERN, "")
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Every flavor in the collection is a real, importable product regardless of
// current stock -- filtering to food-only listings and away from the
// mixed-flavor Starter Pack both already happen in fetchProducts, so nothing
// here needs to skip a product a second time.
export function shouldSkip(_product: UbuFoodsProduct): boolean {
  return false;
}

// The nutrition accordion has no per-flavor markup (unlike Greenbelly's <h4>
// tabs) -- just a flat run of <p> tags for all four flavors in a row,
// separated by a "***" divider. Each block's own leading name is matched
// (optionally followed by a colon -- confirmed live it's inconsistent, e.g.
// "Chipotle:" vs "Cilantro Lime") rather than a DOM element.
function flavorNutritionText(
  $: cheerio.CheerioAPI,
  flavor: string,
): string | null {
  const heading = $(".accordion__title")
    .toArray()
    .find((el) => $(el).text().trim() === "Nutritional Information");
  if (!heading) {
    return null;
  }

  const chunks = $(heading)
    .closest("details")
    .find(".accordion__content")
    .text()
    .split("***");

  const needle = flavor.trim().toLowerCase();
  return (
    chunks.find((chunk) =>
      chunk.trim().toLowerCase().replace(/:$/, "").startsWith(needle),
    ) ?? null
  );
}

// Returns null both when no flavor chunk matched at all (e.g. Everything
// Bagel, which the site currently publishes no nutrition copy for -- confirmed
// live) and when a chunk matched but had no Calories line of its own.
export function parseCalories(flavorText: string | null): number | null {
  if (flavorText === null) {
    return null;
  }
  const match = flavorText.match(/Calories:\s*([\d,]+)/i);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

const OZ_TO_G = 28.3495;
const POUCHES_PER_PACK = 4;
// Stated directly in the product description as the size of one Dayhiker
// Pouch ("four-packs of Dayhiker Pouches (1.5 oz)") -- confirmed live this is
// the same figure for every flavor, since it's the pouch size, not a
// per-flavor recipe difference. Multiplied by the pack count for the total
// dry weight of one catalog item (a 4-pack).
const POUCH_WEIGHT_PATTERN = /Dayhiker Pouches\s*\(([\d.]+)\s*oz\)/i;

export function parseDryWeightGrams(descriptionText: string): number | null {
  const match = descriptionText.match(POUCH_WEIGHT_PATTERN);
  return match
    ? Math.round(Number.parseFloat(match[1]!) * POUCHES_PER_PACK * OZ_TO_G)
    : null;
}

export function parseProduct(product: UbuFoodsProduct): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);
  const flavor = cleanFlavorName(product.flavor);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: product.sourceProductId,
    sourceUrl: product.sourceUrl,
    name: `${cleanProductTitle(product.productTitle)} - ${flavor}`,
    brand: BRAND_NAME,
    calories: parseCalories(flavorNutritionText($, flavor)),
    // Confirmed live the site never states a water quantity anywhere in its
    // copy -- always the generic "Just add water, mix, and enjoy," unlike
    // e.g. Packit Gourmet's explicit oz/ml figure. Systemic gap, so it's
    // excluded from `trackedFields` below rather than left to alert on every
    // run.
    waterMl: null,
    dryWeightGrams: parseDryWeightGrams($(".product__description").text()),
    imageUrl: product.imageUrl,
  };
}

// The nutrition/ingredients accordions and pouch-size description only exist
// on each product's own page, not on the products.json listing -- fetched
// once per product (shared across its flavors), same reasoning as
// Greenbelly's per-product detail-page fetch.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<UbuFoodsProduct[]> {
  const listing = await fetchShopifyProducts<UbuFoodsShopifyProduct>(
    `${STORE_BASE_URL}${COLLECTION_PATH}`,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: UbuFoodsProduct[] = [];
  for (const product of listing) {
    if (!product.tags.some((tag) => tag.toLowerCase() === FOOD_TAG)) {
      continue;
    }

    const productUrl = `${STORE_BASE_URL}/products/${product.handle}`;
    const res = await fetchImpl(productUrl);
    if (!res.ok) {
      throw new Error(
        `uBu Foods product page returned ${res.status} for ${productUrl}`,
      );
    }
    const html = await res.text();

    for (const variant of product.variants) {
      const flavor = variant.option1;
      if (!flavor || STARTER_PACK_PATTERN.test(flavor)) {
        continue;
      }

      products.push({
        sourceProductId: `${product.id}-${slugify(cleanFlavorName(flavor))}`,
        sourceUrl: `${productUrl}?variant=${variant.id}`,
        productTitle: product.title,
        flavor,
        imageUrl: variant.featured_image?.src ?? null,
        html,
      });
    }
  }

  return products;
}

export const ubuFoodsScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
  trackedFields: ["brand", "calories", "dryWeightGrams", "imageId"],
};
