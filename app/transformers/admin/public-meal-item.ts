import type { Image, PublicMealItem } from "../../../generated/prisma/browser";

// Unlike ClientPublicMealItemSummary (which powers the user-facing meal-plan
// search and intentionally hides scrape provenance), this includes the
// source* fields so the admin catalog page can display and edit them.
export type ClientAdminPublicMealItem = Pick<
  PublicMealItem,
  | "id"
  | "name"
  | "brand"
  | "calories"
  | "waterMl"
  | "dryWeightGrams"
  | "sourceVendor"
  | "sourceProductId"
  | "sourceUrl"
  | "sourceImageUrl"
  | "overrideImageUrl"
  | "readyOverride"
> & {
  imageUrl: string | null;
};

export function transform(
  item: PublicMealItem & { image: Image | null },
): ClientAdminPublicMealItem {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    calories: item.calories,
    waterMl: item.waterMl,
    dryWeightGrams: item.dryWeightGrams,
    sourceVendor: item.sourceVendor,
    sourceProductId: item.sourceProductId,
    sourceUrl: item.sourceUrl,
    sourceImageUrl: item.sourceImageUrl,
    overrideImageUrl: item.overrideImageUrl,
    readyOverride: item.readyOverride,
    imageUrl: item.image
      ? `${process.env.R2_PUBLIC_BASE_URL}/${item.image.r2Key}`
      : null,
  };
}
