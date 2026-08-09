import { transform as accountSettingTransform } from "$/transformers/account-settings/account-setting";
import { transform as userAccountSettingsTransform } from "$/transformers/account-settings/user-account-settings";
import {
  transform as adminFeedbackTransform,
  transformFull as adminFullFeedbackTransform,
  transformListItem as adminFeedbackListItemTransform,
} from "$/transformers/admin/feedback";
import { transform as adminFeedbackNoteTransform } from "$/transformers/admin/feedback-note";
import { transform as adminSessionTransform } from "$/transformers/admin/session";
import {
  transform as adminUserTransform,
  transformWithCounts as adminUserWithCountsTransform,
} from "$/transformers/admin/user";
import { transform as gearCategoryTransform } from "$/transformers/gear-category";
import { transform as gearInventoryItemTransform } from "$/transformers/gear-inventory-item";
import { transform as mealPlanDayTransform } from "$/transformers/meal-plan/day";
import { transform as mealPlanItemTransform } from "$/transformers/meal-plan/item";
import { transform as mealPlanItemSearchResultTransform } from "$/transformers/meal-plan/item-search-result";
import { transform as mealPlanItemSummaryTransform } from "$/transformers/meal-plan/item-summary";
import { transform as publicMealItemSummaryTransform } from "$/transformers/meal-plan/public-item-summary";
import { transform as notificationTransform } from "$/transformers/notification";
import { transform as packingListTransform } from "$/transformers/packing-list";
import { transform as packingListItemTransform } from "$/transformers/packing-list-item";
import { transform as packingListSectionTransform } from "$/transformers/packing-list-section";
import { transform as placeTransform } from "$/transformers/place";
import {
  transformFull as fullTripTransform,
  transform as tripTransform,
} from "$/transformers/trip";
import { transform as tripLinkTransform } from "$/transformers/trip-link";
import { transform as tripPackingListTransform } from "$/transformers/trip-packing-list";
import { transform as tripPackingListItemTransform } from "$/transformers/trip-packing-list/item";
import { transform as tripTaskTransform } from "$/transformers/trip-task";

export const transformers = {
  gearCategory: gearCategoryTransform,
  gearInventoryItem: gearInventoryItemTransform,
  packingList: packingListTransform,
  packingListSection: packingListSectionTransform,
  packingListItem: packingListItemTransform,
  place: placeTransform,
  trip: tripTransform,
  fullTrip: fullTripTransform,
  tripTask: tripTaskTransform,
  tripLink: tripLinkTransform,
  mealPlanDay: mealPlanDayTransform,
  mealPlanItem: mealPlanItemTransform,
  mealPlanItemSummary: mealPlanItemSummaryTransform,
  mealPlanItemSearchResult: mealPlanItemSearchResultTransform,
  publicMealItemSummary: publicMealItemSummaryTransform,
  notification: notificationTransform,
  tripPackingList: tripPackingListTransform,
  tripPackingListItem: tripPackingListItemTransform,
  accountSetting: accountSettingTransform,
  userAccountSettings: userAccountSettingsTransform,
  admin: {
    feedback: adminFeedbackTransform,
    feedbackListItem: adminFeedbackListItemTransform,
    fullFeedback: adminFullFeedbackTransform,
    feedbackNote: adminFeedbackNoteTransform,
    user: adminUserTransform,
    userWithCounts: adminUserWithCountsTransform,
    session: adminSessionTransform,
  },
} as const;
