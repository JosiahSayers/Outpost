import type { PublicMealItem } from "../../../../generated/prisma/browser";
import type { PublicMealItemUncheckedCreateInput } from "../../../../generated/prisma/models";

// What a vendor scraper produces for one product, before merging against any
// existing row. `null` on a nullable field means "couldn't parse it this
// run" -- distinct from "not applicable," which this catalog doesn't model.
export interface ScrapedPublicMealItem {
  sourceVendor: string;
  sourceProductId: string;
  sourceUrl: string;
  name: string;
  brand: string | null;
  calories: number | null;
  waterMl: number | null;
  dryWeightGrams: number | null;
  imageUrl: string | null;
}

export type MergedPublicMealItemFields = Omit<
  PublicMealItemUncheckedCreateInput,
  "imageId"
>;

// Per nullable field: `newValue ?? existingValue`, so a re-scrape never
// blanks out a value that was previously parsed or manually fixed by an
// admin (BTP-110) -- "incomplete" is always just whatever's still null on the
// row right now, with no separate "was this already fixed" tracking needed.
// `name`/`sourceUrl` always take the fresh scrape since they're not
// best-effort parses -- the vendor always supplies them.
export function mergePublicMealItem(
  scraped: ScrapedPublicMealItem,
  existing: PublicMealItem | null,
): MergedPublicMealItemFields {
  // An admin's photo override (BTP-136) rides along untouched as long as the
  // vendor's own source image url hasn't moved since we last saw it -- once
  // it does, the override is stale (the product photo genuinely changed at
  // the source) so it's dropped and the fresh scrape takes over instead.
  const sourceImageUrlChanged =
    scraped.imageUrl != null && scraped.imageUrl !== existing?.sourceImageUrl;

  return {
    name: scraped.name,
    brand: scraped.brand ?? existing?.brand ?? null,
    calories: scraped.calories ?? existing?.calories ?? null,
    waterMl: scraped.waterMl ?? existing?.waterMl ?? null,
    dryWeightGrams: scraped.dryWeightGrams ?? existing?.dryWeightGrams ?? null,
    sourceImageUrl: scraped.imageUrl ?? existing?.sourceImageUrl ?? null,
    overrideImageUrl: sourceImageUrlChanged
      ? null
      : (existing?.overrideImageUrl ?? null),
    sourceUrl: scraped.sourceUrl,
    sourceVendor: scraped.sourceVendor,
    sourceProductId: scraped.sourceProductId,
  };
}
