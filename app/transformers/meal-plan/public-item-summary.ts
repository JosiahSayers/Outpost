import type {
  Image,
  PublicMealItem,
} from "../../../generated/prisma/browser";

export type ClientPublicMealItemSummary = Pick<
  PublicMealItem,
  "id" | "name" | "brand" | "calories" | "waterMl" | "dryWeightGrams"
> & {
  imageUrl: string | null;
};

export function transform(
  item: PublicMealItem & { image: Image | null },
): ClientPublicMealItemSummary {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    calories: item.calories,
    waterMl: item.waterMl,
    dryWeightGrams: item.dryWeightGrams,
    imageUrl: item.image
      ? `${process.env.R2_PUBLIC_BASE_URL}/${item.image.r2Key}`
      : null,
  };
}
