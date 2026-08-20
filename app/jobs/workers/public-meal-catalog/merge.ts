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

  const brand = scraped.brand ?? existing?.brand ?? null;
  const calories = scraped.calories ?? existing?.calories ?? null;
  const waterMl = scraped.waterMl ?? existing?.waterMl ?? null;
  const dryWeightGrams =
    scraped.dryWeightGrams ?? existing?.dryWeightGrams ?? null;

  // A later import can fill in (or revise) one of the completeness fields
  // without fully resolving the gap -- e.g. waterMl finally gets parsed but
  // dryWeightGrams still doesn't. That's new information an admin hasn't
  // seen, so a standing readyOverride needs to be re-reviewed rather than
  // silently continuing to apply to a row that's changed underneath it. If
  // the row is fully complete now, the flag is moot either way -- the
  // completeness check in searchMealPlanItems passes on its own merits.
  const completenessFieldChanged =
    brand !== (existing?.brand ?? null) ||
    calories !== (existing?.calories ?? null) ||
    waterMl !== (existing?.waterMl ?? null) ||
    dryWeightGrams !== (existing?.dryWeightGrams ?? null);
  const stillIncomplete =
    brand == null ||
    calories == null ||
    waterMl == null ||
    dryWeightGrams == null;

  return {
    name: scraped.name,
    brand,
    calories,
    waterMl,
    dryWeightGrams,
    sourceImageUrl: scraped.imageUrl ?? existing?.sourceImageUrl ?? null,
    overrideImageUrl: sourceImageUrlChanged
      ? null
      : (existing?.overrideImageUrl ?? null),
    readyOverride:
      completenessFieldChanged && stillIncomplete
        ? false
        : (existing?.readyOverride ?? false),
    sourceUrl: scraped.sourceUrl,
    sourceVendor: scraped.sourceVendor,
    sourceProductId: scraped.sourceProductId,
  };
}
