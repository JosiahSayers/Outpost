import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://greenbelly.co";
export const SOURCE_VENDOR = "greenbelly";
// Single-vendor site -- every product this scraper sees is Greenbelly's own
// by construction, same reasoning as Peak Refuel's hardcoded brand.
const BRAND_NAME = "Greenbelly";
const PAGE_SIZE = 250;

// Mud Meal 2.0 is Greenbelly's one non-bar product -- a powdered shake mix
// that genuinely requires mixing with water (confirmed live: "Add 2 heaping
// scoops of Mud Meal to roughly 6-10 oz of water"), unlike the two meal-bar
// products. `product_type`/tags carry no such distinction (both are empty or
// unhelpful across the whole catalog). `template_suffix` looked like a clean
// signal too ("mudmeal2" only on Mud Meal) and is populated on the
// single-product endpoint, but confirmed live it's always null on the
// collection-level products.json listing endpoint this scraper actually
// calls -- every product silently came back non-drinkable, including Mud
// Meal itself. `handle` is reliably present on this endpoint and stable
// (Shopify handles are effectively permanent -- changing one breaks
// existing URLs/SEO), so it's used instead.
const MUD_MEAL_HANDLE = "mud-meals-2";

// "Variety" is an assorted mix of the other flavors within one order, not a
// distinct flavor of its own -- confirmed live it's the only flavor value
// with no corresponding nutrition-tab entry -- so it's excluded the same way
// Wild Zora/Good To-Go/Peak Refuel each exclude their own variety packs.
const EXCLUDED_FLAVOR_VALUES = new Set(["variety"]);

interface GreenbellyVariant {
  id: number;
  available: boolean;
  requires_shipping: boolean;
  option1: string | null;
  option2: string | null;
  grams: number;
}

interface GreenbellyImage {
  id: number;
  src: string;
  // Each flavor-specific packaging shot lists the variant ids it belongs to
  // -- e.g. Mud Meal's Vanilla and Strawberry images each list only their
  // own variant. `product.images[0]` is instead a Variety/assortment group
  // shot with no variant_ids of its own. Confirmed live this listing
  // endpoint's own `variant.image_id` field is always null (unlike the
  // single-product endpoint) -- this reverse mapping is the only one that
  // actually works here.
  variant_ids: number[];
}

interface GreenbellyOption {
  name: string;
  position: number;
  values: string[];
}

interface GreenbellyShopifyProduct extends Omit<
  ShopifyProduct,
  "variants" | "images"
> {
  options: GreenbellyOption[];
  images: GreenbellyImage[];
  variants: GreenbellyVariant[];
}

// One entry per flavor rather than per Shopify product -- confirmed live
// each of Greenbelly's 3 products bundles several flavors (and, for the two
// bar products, several bulk-buy count tiers on top of that) into a single
// Shopify listing, but each flavor has its own nutrition facts and is sold
// as its own SKU, so each becomes its own catalog item here.
export interface GreenbellyProduct {
  sourceProductId: string;
  sourceUrl: string;
  productTitle: string;
  flavor: string;
  isDrinkableMeal: boolean;
  variantGrams: number;
  imageUrl: string | null;
  html: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Shopify's own product title carries a temporary "(NEW!)" marketing
// prefix on the newest product -- confirmed live it's not a permanent
// naming convention (neither of the other 2 products has one) -- so it's
// stripped from the catalog name rather than kept as launch-announcement
// noise.
const NEW_PREFIX_PATTERN = /^\(new!?\)\s*/i;

function cleanProductTitle(title: string): string {
  return title.replace(NEW_PREFIX_PATTERN, "").trim();
}

// Mud Meal's flavor option values carry a " | <qualifier>" suffix
// describing the flavor's dietary profile ("Vanilla | Original",
// "Strawberry | Plant Based") rather than the flavor itself -- confirmed
// live neither bar product's flavor values have this pattern. The full
// value (qualifier included) is still used for nutrition-tab heading
// matching, which states the same "| " wording -- only the display name
// drops it.
function cleanFlavorName(flavor: string): string {
  return flavor.split("|")[0]!.trim();
}

// The full live catalog (confirmed via products.json) is just these 3
// products, expanded into one item per flavor below -- no gift cards,
// apparel, or bundles to filter out, unlike every other vendor in this
// catalog. Mud Meal 2.0's variants are currently all out of stock, but it
// stays importable rather than disappearing from the catalog while sold
// out, same reasoning as every other vendor's out-of-stock handling.
export function shouldSkip(_product: GreenbellyProduct): boolean {
  return false;
}

// Scoped to the product page's own description/nutrition/FAQ tabs -- the
// only place calorie, water, and weight figures appear (body_html is always
// empty) -- rather than searched page-wide, which would also catch customer
// review text mentioning unrelated quantities.
function tabsText($: cheerio.CheerioAPI): string {
  return $(".dm-product-tabs").text();
}

// The nutrition tab's per-flavor heading text doesn't match the Shopify
// flavor option value verbatim -- e.g. the "Spiced Apple" option's heading
// is "SPICED CARAMEL APPLE" -- so a heading is matched by "every word of the
// option value appears in the heading" rather than an exact string compare.
// Returns null (rather than some other flavor's figures) when no heading
// matches, e.g. a newly added flavor whose nutrition copy hasn't caught up.
function flavorNutritionText(
  $: cheerio.CheerioAPI,
  flavor: string,
): string | null {
  const flavorWords: string[] = flavor.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const heading = $(".dm-product-tabs h4")
    .toArray()
    .find((el) => {
      const headingWords: string[] =
        $(el)
          .text()
          .toUpperCase()
          .match(/[A-Z0-9]+/g) ?? [];
      return flavorWords.every((word) => headingWords.includes(word));
    });
  return heading ? $(heading).next("p").text() : null;
}

// Stated as "Calories: NNN" in the matched flavor's own nutrition block --
// confirmed live across all 3 products.
export function parseCalories(flavorText: string | null): number | null {
  if (flavorText === null) {
    return null;
  }
  const match = flavorText.match(/Calories:\s*([\d,]+)/i);
  return match ? Number.parseInt(match[1]!.replace(/,/g, ""), 10) : null;
}

const OZ_TO_ML = 29.5735;
// Only Mud Meal states a water instruction ("Add 2 heaping scoops of Mud
// Meal to roughly 6-10 oz of water") -- confirmed live neither bar product's
// copy mentions water anywhere in its tabs. The midpoint of the range is
// used rather than picking a bound, same reasoning as Angry Pika. This
// instruction is shared across both of Mud Meal's flavors, not per-flavor.
const WATER_OZ_PATTERN =
  /to\s+roughly\s+([\d.]+)(?:\s*-\s*([\d.]+))?\s*oz\s+of\s+water/i;

export function parseWaterMl(text: string): number | null {
  const match = text.match(WATER_OZ_PATTERN);
  if (!match) {
    return null;
  }
  const low = Number.parseFloat(match[1]!);
  const high = match[2] ? Number.parseFloat(match[2]) : low;
  return Math.round(((low + high) / 2) * OZ_TO_ML);
}

// Both bar products state their single meal's weight directly in the WEIGHT
// FAQ entry ("About 5.5 oz (155 g). One package = one meal = two bars.") --
// confirmed live this is the same for every flavor of a given product
// (unlike calories), since it's the two-bar serving size, not a per-flavor
// figure.
const MEAL_WEIGHT_PATTERN = /About\s+[\d.]+\s*oz\s*\(([\d.]+)\s*g\)/i;

export function parseDryWeightGrams(
  product: GreenbellyProduct,
  text: string,
): number | null {
  if (product.isDrinkableMeal) {
    return product.variantGrams;
  }
  const match = text.match(MEAL_WEIGHT_PATTERN);
  return match ? Math.round(Number.parseFloat(match[1]!)) : null;
}

export function parseProduct(
  product: GreenbellyProduct,
): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);
  const text = tabsText($);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: product.sourceProductId,
    sourceUrl: product.sourceUrl,
    name: `${cleanProductTitle(product.productTitle)} - ${titleCase(cleanFlavorName(product.flavor))}`,
    brand: BRAND_NAME,
    calories: parseCalories(flavorNutritionText($, product.flavor)),
    // Both bar products are confirmed ready-to-eat straight from the
    // package ("A true ready-to-eat meal. Just tear open and eat. No
    // cooking... no cleaning.") -- hardcoded to 0 rather than left to a
    // (always-failing) water-instruction parse, same as Angry Pika's trail
    // cookies. Mud Meal genuinely needs water, so its real figure is parsed.
    waterMl: product.isDrinkableMeal ? parseWaterMl(text) : 0,
    dryWeightGrams: parseDryWeightGrams(product, text),
    imageUrl: product.imageUrl,
  };
}

// body_html is always empty on this store's products.json feed -- every
// product's own page is fetched once (shared across all its flavors) for
// its description/nutrition/FAQ tabs, same reasoning as Packit Gourmet's
// per-product detail-page fetch.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<GreenbellyProduct[]> {
  const listing = await fetchShopifyProducts<GreenbellyShopifyProduct>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: GreenbellyProduct[] = [];
  for (const product of listing) {
    const productUrl = `${STORE_BASE_URL}/products/${product.handle}`;
    const res = await fetchImpl(productUrl);
    if (!res.ok) {
      throw new Error(
        `Greenbelly product page returned ${res.status} for ${productUrl}`,
      );
    }
    const html = await res.text();
    const isDrinkableMeal = product.handle === MUD_MEAL_HANDLE;

    // Every product in the catalog carries a Flavor option (confirmed live,
    // named "Flavor" on the bar products and "Flavor (One Bag)" on Mud
    // Meal) -- falling back to the product's own title keeps a future
    // product without one importable as a single item rather than silently
    // dropped.
    const flavorOption = product.options.find((option) =>
      /flavor/i.test(option.name),
    );
    const flavorValues = flavorOption?.values ?? [product.title];
    const flavorPosition = flavorOption?.position ?? 1;

    for (const flavor of flavorValues) {
      if (EXCLUDED_FLAVOR_VALUES.has(flavor.toLowerCase())) {
        continue;
      }

      const variant = product.variants.find(
        (v) => (flavorPosition === 1 ? v.option1 : v.option2) === flavor,
      );
      if (!variant) {
        continue;
      }

      // Falls back to the product's first image (a Variety/assortment group
      // shot) only if this flavor's variant isn't listed against any image
      // -- confirmed live every real flavor variant is, so this only guards
      // against a future catalog gap.
      const image = product.images.find((img) =>
        img.variant_ids.includes(variant.id),
      );

      products.push({
        sourceProductId: `${product.id}-${slugify(flavor)}`,
        sourceUrl: `${productUrl}?variant=${variant.id}`,
        productTitle: product.title,
        flavor,
        isDrinkableMeal,
        variantGrams: variant.grams,
        imageUrl: image?.src ?? product.images[0]?.src ?? null,
        html,
      });
    }
  }

  return products;
}

export const greenbellyScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
