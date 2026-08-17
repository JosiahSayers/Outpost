import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://bighornmf.com";
export const SOURCE_VENDOR = "bighorn_mountain_food";
// Hardcoded rather than trusting the vendor's own `vendor` JSON field --
// confirmed live it's the all-caps "BIGHORN Mountain Food" on every product,
// same reasoning as Mountain House's hardcoded brand.
const BRAND_NAME = "Bighorn Mountain Food";
const PAGE_SIZE = 250;

// Foods only -- confirmed live the catalog also carries Coozies
// (product_type "Coozie") and an internal wholesale sample-box insert card
// (product_type "Marketing Collateral"), neither of which is food.
const INCLUDED_PRODUCT_TYPE = "Freeze dried meal";

// Every "-case-15-meals"/"-N-pack" handle is a duplicate of a retail single
// meal -- same dish, same price, same weight -- republished under its own
// SKU for the wholesale ordering channel. Confirmed live all such duplicates
// carry this tag and no genuine retail listing does.
const WHOLESALE_TAG = "wholesale";

// "Expedition Pack" bundles (Chicken Coop, Pasta Feed, Carnivore, Beast Mode,
// All In) are multi-pouch, multi-flavor boxes, not a single catalog item --
// confirmed live none carries a tag distinguishing it from a genuine single
// entree, but every one has "Expedition Pack" in its title and no single
// meal does.
const EXPEDITION_PACK_TITLE_PATTERN = /expedition pack/i;

interface BighornVariant {
  title: string;
  grams: number;
  available: boolean;
  requires_shipping: boolean;
}

export interface BighornMountainFoodListing extends Omit<
  ShopifyProduct,
  "variants"
> {
  variants: BighornVariant[];
}

export interface BighornMountainFoodProduct extends BighornMountainFoodListing {
  html: string;
}

// Deliberately doesn't exclude a product just because every variant is
// currently unavailable on Bighorn's own site -- a user may already own it
// from a prior restock, or be able to source it elsewhere, so it stays
// importable rather than disappearing from the catalog while sold out.
export function shouldSkip(product: BighornMountainFoodListing): boolean {
  if (product.product_type !== INCLUDED_PRODUCT_TYPE) {
    return true;
  }
  if (product.tags.includes(WHOLESALE_TAG)) {
    return true;
  }
  return EXPEDITION_PACK_TITLE_PATTERN.test(product.title);
}

// Every genuine retail listing's size option includes a single-pouch variant
// titled "1 Pack" (or "1 Packs" -- a vendor typo on a couple of products) --
// confirmed live across the catalog. Its Shopify shipping weight lines up
// with the single-serving pouch weight, which the vendor never states as
// text anywhere on the page -- same reasoning as Good To-Go reading
// variant.grams.
const SINGLE_SERVING_VARIANT_PATTERN = /^1 packs?$/i;

export function parseDryWeightGrams(
  product: BighornMountainFoodListing,
): number | null {
  const singleServing = product.variants.find((variant) =>
    SINGLE_SERVING_VARIANT_PATTERN.test(variant.title),
  );
  return singleServing?.grams ?? null;
}

// Two separate highlight blocks coexist on every product page with
// different copy -- an older "features-highlights" block (calories) and the
// currently-rendered "product__hero-highlights" list (water) -- confirmed
// live neither one carries both figures.
function featuresText($: cheerio.CheerioAPI): string {
  return $(".features-highlights__item-description").text();
}

function heroHighlightsText($: cheerio.CheerioAPI): string {
  return $(".product__hero-highlights").text();
}

// Calories only ever appear in the "N satisfying/energizing calories in a
// lightweight pouch" highlight bullet -- confirmed live it's never in
// body_html (only baked into a nutrition-label image elsewhere on the page),
// so the product's own rendered page has to be fetched for this field, same
// reasoning as Mountain House's nutrition-panel fetch.
const CALORIES_PATTERN =
  /([\d,]+)(?:\s+\S+)?\s+calories in a lightweight pouch/i;

export function parseCalories(text: string): number | null {
  const match = text.match(CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

// The primary product image occasionally has the true calorie count baked
// into its filename (e.g. "BirriaPackShot-640Calories_..."). Confirmed live
// this is the more current figure when present: Mexican Style Birria &
// Rice's own "N ... calories in a lightweight pouch" highlight bullet is
// stuck at a stale 490 (pre-recipe-change marketing copy that was never
// updated), while its current packshot filename and printed Nutrition Facts
// Panel both say 640. Every other product's image filename carries no
// calorie figure at all, so parseCalories' bullet-text reading remains the
// fallback for them.
const IMAGE_CALORIES_PATTERN = /(\d+)\s*calories/i;

export function parseCaloriesFromImage(imageUrl: string | null): number | null {
  const match = imageUrl?.match(IMAGE_CALORIES_PATTERN);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

const CUP_TO_ML = 236.588;

// Handles "1", "1/2", and "1 1/2" (mixed number) -- every form seen in the
// live "Quick & Easy" bullet ("add 1 1/2 cups boiling water" / "add 1 1/4
// cups boiling water"). No unicode fraction glyphs seen live, unlike Peak
// Refuel's copy.
function parseCupQuantity(raw: string): number {
  return raw
    .trim()
    .split(/\s+/)
    .reduce((total, part) => {
      if (part.includes("/")) {
        const [n, d] = part.split("/").map(Number);
        return total + n! / d!;
      }
      return total + Number.parseFloat(part);
    }, 0);
}

// Always stated as a cup quantity in the "Quick & Easy" hero-highlight
// bullet ("add 1 1/2 cups boiling water, ready in 15 minutes") -- confirmed
// live across the catalog, unlike Peak Refuel where roughly half of product
// copy omits it.
const WATER_PATTERN =
  /add\s+((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s*cups?\s+boiling water/i;

export function parseWaterMl(text: string): number | null {
  const match = text.match(WATER_PATTERN);
  return match ? Math.round(parseCupQuantity(match[1]!) * CUP_TO_ML) : null;
}

export function parseProduct(
  product: BighornMountainFoodProduct,
): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);
  const imageUrl = product.images[0]?.src ?? null;

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories:
      parseCaloriesFromImage(imageUrl) ?? parseCalories(featuresText($)),
    waterMl: parseWaterMl(heroHighlightsText($)),
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl,
  };
}

// Filtering (product_type/tag/title) happens against the products.json
// listing before any detail-page fetch, same reasoning as Mountain House --
// fetching every listing's page just to discard bundles/wholesale
// duplicates/accessories would be pure waste.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<BighornMountainFoodProduct[]> {
  const listing = await fetchShopifyProducts<BighornMountainFoodListing>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: BighornMountainFoodProduct[] = [];
  for (const item of listing) {
    if (shouldSkip(item)) {
      continue;
    }

    const url = `${STORE_BASE_URL}/products/${item.handle}`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      throw new Error(
        `Bighorn Mountain Food product page returned ${res.status} for ${url}`,
      );
    }

    products.push({ ...item, html: await res.text() });
  }

  return products;
}

export const bighornMountainFoodScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
