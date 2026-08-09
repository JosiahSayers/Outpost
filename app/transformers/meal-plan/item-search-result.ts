import type {
  Image,
  MealPlanItem,
  PublicMealItem,
} from "../../../generated/prisma/client";
import {
  transform as itemSummaryTransform,
  type ClientMealPlanItemSummary,
} from "./item-summary";
import {
  transform as publicItemSummaryTransform,
  type ClientPublicMealItemSummary,
} from "./public-item-summary";

// One row from searchMealPlanItems (search-helpers.ts) -- a raw MealPlanItem
// or PublicMealItem tagged with which table it came from.
export type MealPlanItemSearchResult =
  | { source: "own"; item: MealPlanItem }
  | { source: "public"; item: PublicMealItem & { image: Image | null } };

export type ClientMealPlanItemSearchResult =
  | ({ source: "own" } & ClientMealPlanItemSummary)
  | ({ source: "public" } & ClientPublicMealItemSummary);

export function transform(
  result: MealPlanItemSearchResult,
): ClientMealPlanItemSearchResult {
  return result.source === "own"
    ? { source: "own", ...itemSummaryTransform(result.item) }
    : { source: "public", ...publicItemSummaryTransform(result.item) };
}
