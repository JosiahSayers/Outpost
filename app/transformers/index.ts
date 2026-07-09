import { transform as gearCategoryTransform } from "$/transformers/gear-category";
import { transform as gearInventoryItemTransform } from "$/transformers/gear-inventory-item";
import { transform as mealPlanDayTransform } from "$/transformers/meal-plan/day";
import { transform as mealPlanItemTransform } from "$/transformers/meal-plan/item";
import { transform as packingListTransform } from "$/transformers/packing-list";
import { transform as packingListItemTransform } from "$/transformers/packing-list-item";
import { transform as packingListSectionTransform } from "$/transformers/packing-list-section";
import {
  transformFull as fullTripTransform,
  transform as tripTransform,
} from "$/transformers/trip";
import { transform as tripTaskTransform } from "$/transformers/trip-task";

export const transformers = {
  gearCategory: gearCategoryTransform,
  gearInventoryItem: gearInventoryItemTransform,
  packingList: packingListTransform,
  packingListSection: packingListSectionTransform,
  packingListItem: packingListItemTransform,
  trip: tripTransform,
  fullTrip: fullTripTransform,
  tripTask: tripTaskTransform,
  mealPlanDay: mealPlanDayTransform,
  mealPlanItem: mealPlanItemTransform,
} as const;
