import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import {
  fetchShopifyProducts,
  type ShopifyProduct,
} from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import * as cheerio from "cheerio";

const STORE_BASE_URL = "https://luxeflybasecamp.com";
const ITSGOT_BASE_URL = "https://itsgot.com";
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

// This vendor uploads most product photos as HEIC, which Shopify's CDN
// transcodes on delivery to whatever format the requester's Accept header
// implies -- and confirmed live, occasionally to an oversized lossless PNG
// (Chicken Pozole Verde's raw asset serves at 17MB) that blows past the
// shared image pipeline's 8MB cap (image.ts MAX_IMAGE_BYTES), silently
// failing image processing for that product. Requesting Shopify's `width`
// transform param bounds every photo's re-encoded size well under that
// limit, non-HEIC sources included, without needing to special-case the
// extension.
const IMAGE_WIDTH = 1600;

interface LuxeflyBasecampVariant {
  available: boolean;
  requires_shipping: boolean;
  grams: number;
}

export interface LuxeflyBasecampListing extends Omit<
  ShopifyProduct,
  "variants"
> {
  variants: LuxeflyBasecampVariant[];
}

export interface LuxeflyBasecampProduct extends LuxeflyBasecampListing {
  html: string;
  // null when the product's body_html carries no itsgot.com nutrition-label
  // embed at all (see extractItsGotIds) -- distinct from a fetched-but-empty
  // label, which parseCalories also reduces to null.
  nutritionHtml: string | null;
}

// Deliberately doesn't exclude a meal just because every variant is
// currently unavailable on Luxefly Basecamp's own site -- a user may already
// own it from a prior restock, or be able to source it elsewhere, so it
// stays importable rather than disappearing from the catalog while sold out.
export function shouldSkip(product: LuxeflyBasecampListing): boolean {
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
  product: LuxeflyBasecampListing,
): number | null {
  return product.variants[0]?.grams ?? null;
}

export function selectImageUrl(product: LuxeflyBasecampListing): string | null {
  const packagingImage = product.images.find(
    (image) => !COOKED_IMAGE_NAME_PATTERN.test(image.src),
  );
  const selected = packagingImage ?? product.images[0];
  if (!selected) {
    return null;
  }
  const url = new URL(selected.src);
  url.searchParams.set("width", String(IMAGE_WIDTH));
  return url.toString();
}

// The nutrition-facts panel isn't rendered by Luxefly Basecamp's own theme
// at all -- confirmed live it's an iframe embed from a third-party
// "itsgot.com" nutrition-label app, driven by a `data-itsgot-user`/
// `data-itsgot-label` pair the vendor bakes into the product's own
// body_html (already present in the products.json listing, so this needs no
// extra fetch to discover). itsgot's own embed.js fetches
// `/users/{user}/labels/{label}/embed` directly for search-engine bots, and
// that same URL returns the identical server-rendered markup the iframe
// would show, so no browser/JS execution is needed to read it either.
function extractItsGotIds(
  bodyHtml: string,
): { user: string; label: string } | null {
  const user = bodyHtml.match(/data-itsgot-user="(\d+)"/)?.[1];
  const label = bodyHtml.match(/data-itsgot-label="(\d+)"/)?.[1];
  return user && label ? { user, label } : null;
}

const NUTRITION_LABEL_SELECTOR =
  'div[data-react-class="ProductLabel/US/NutritionFacts/Vertical/Label"]';

// The label markup is a react-rails mount point: the actual nutrition data
// lives entirely in its `data-react-props` JSON attribute (cheerio decodes
// the &quot;-escaped JSON back to a plain string), not in any rendered
// child text. Confirmed live across the catalog every meal's label carries
// exactly one `nutrition_facts` entry.
export function parseCalories(nutritionHtml: string | null): number | null {
  if (!nutritionHtml) {
    return null;
  }

  const props = cheerio
    .load(nutritionHtml)(NUTRITION_LABEL_SELECTOR)
    .attr("data-react-props");
  if (!props) {
    return null;
  }

  try {
    const parsed = JSON.parse(props) as {
      product?: { nutrition_facts?: { calories?: number | null }[] };
    };
    return parsed.product?.nutrition_facts?.[0]?.calories ?? null;
  } catch {
    return null;
  }
}

// Selected by heading text rather than a fixed id/class -- confirmed live
// the accordion's id attribute is a per-product random string
// ("...tab_fNqChd-template--...") with no stable selector, and an
// "Ingredients" accordion using the identical classes sits right next to it.
function mealPreparationText($: cheerio.CheerioAPI): string {
  const heading = $(".accordion__title").filter(
    (_, el) => $(el).text().trim() === "Meal Preparation",
  );
  return heading.closest("details").find(".accordion__content").text();
}

const OZ_TO_ML = 29.5735;

// Most products' Meal Preparation copy just says "add hot/boiling water
// directly to the bag" with no quantity -- confirmed live across the
// catalog this is a genuine per-product gap, not systemic, since a
// meaningful share do state an oz figure. Ranges ("8-12 oz") are averaged
// rather than picking either bound, same reasoning as Angry Pika's granola
// prep copy.
const WATER_PATTERN =
  /add\s+([\d.]+)(?:\s*-\s*([\d.]+))?\s*oz\s+of\s+boiling water/i;

export function parseWaterMl(text: string): number | null {
  const match = text.match(WATER_PATTERN);
  if (!match) {
    return null;
  }
  const low = Number.parseFloat(match[1]!);
  const high = match[2] ? Number.parseFloat(match[2]) : low;
  return Math.round(((low + high) / 2) * OZ_TO_ML);
}

export function parseProduct(
  product: LuxeflyBasecampProduct,
): ScrapedPublicMealItem {
  const $ = cheerio.load(product.html);

  return {
    sourceVendor: SOURCE_VENDOR,
    sourceProductId: String(product.id),
    sourceUrl: `${STORE_BASE_URL}/products/${product.handle}`,
    name: product.title,
    brand: BRAND_NAME,
    calories: parseCalories(product.nutritionHtml),
    waterMl: parseWaterMl(mealPreparationText($)),
    dryWeightGrams: parseDryWeightGrams(product),
    imageUrl: selectImageUrl(product),
  };
}

// Unlike the products.json listing fields (tags, title, variant weight,
// images), calories and water quantity both require fetching the product's
// own rendered page (Meal Preparation copy) and its itsgot.com nutrition
// label -- filtering happens against the listing first, same reasoning as
// Mountain House, so a skipped bundle/gift-card/subscription never triggers
// either fetch.
export async function fetchProducts(
  fetchImpl: typeof fetch = fetch,
): Promise<LuxeflyBasecampProduct[]> {
  const listing = await fetchShopifyProducts<LuxeflyBasecampListing>(
    STORE_BASE_URL,
    fetchImpl,
    PAGE_SIZE,
  );

  const products: LuxeflyBasecampProduct[] = [];
  for (const item of listing) {
    if (shouldSkip(item)) {
      continue;
    }

    const productUrl = `${STORE_BASE_URL}/products/${item.handle}`;
    const res = await fetchImpl(productUrl);
    if (!res.ok) {
      throw new Error(
        `Luxefly Basecamp product page returned ${res.status} for ${productUrl}`,
      );
    }
    const html = await res.text();

    let nutritionHtml: string | null = null;
    const ids = extractItsGotIds(item.body_html);
    if (ids) {
      const nutritionUrl = `${ITSGOT_BASE_URL}/users/${ids.user}/labels/${ids.label}/embed`;
      const nutritionRes = await fetchImpl(nutritionUrl);
      if (!nutritionRes.ok) {
        throw new Error(
          `itsgot.com nutrition label returned ${nutritionRes.status} for ${nutritionUrl}`,
        );
      }
      nutritionHtml = await nutritionRes.text();
    }

    products.push({ ...item, html, nutritionHtml });
  }

  return products;
}

export const luxeflyBasecampScraper = {
  vendorId: SOURCE_VENDOR,
  fetchProducts,
  shouldSkip,
  parseProduct,
};
