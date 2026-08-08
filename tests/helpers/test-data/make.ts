import { ModelName } from "../../../generated/prisma/internal/prismaNamespace";
import type { PickStringLiteral } from "../../../type-helpers";
import makeAccountSetting from "./generators/account-setting";
import makeAccountSettingValue from "./generators/account-setting-value";
import makeFeedback from "./generators/feedback";
import makeFeedbackAuditLog from "./generators/feedback-audit-log";
import makeFeedbackNote from "./generators/feedback-note";
import makeGearCategory from "./generators/gear-category";
import makeGearInventoryItem from "./generators/gear-inventory-item";
import makeImage from "./generators/image";
import makeMealPlanDay from "./generators/meal-plan-day";
import makeMealPlanDayItem from "./generators/meal-plan-day-item";
import makeMealPlanItem from "./generators/meal-plan-item";
import makeNotification from "./generators/notification";
import makePackingList from "./generators/packing-list";
import makePackingListItem from "./generators/packing-list-item";
import makePackingListSection from "./generators/packing-list-section";
import makePlace from "./generators/place";
import makePublicMealItem from "./generators/public-meal-item";
import makeSession from "./generators/session";
import makeTrip from "./generators/trip";
import makeTripLink from "./generators/trip-link";
import makeTripPackingList from "./generators/trip-packing-list";
import makeTripPackingListItemStatus from "./generators/trip-packing-list-item-status";
import makeTripTask from "./generators/trip-task";
import makeUser from "./generators/user";

type SupportedModels = PickStringLiteral<
  ModelName,
  | "AccountSetting"
  | "AccountSettingValue"
  | "Feedback"
  | "FeedbackAuditLog"
  | "FeedbackNote"
  | "GearInventoryItem"
  | "GearCategory"
  | "PackingList"
  | "PackingListSection"
  | "PackingListItem"
  | "Place"
  | "Session"
  | "Trip"
  | "TripLink"
  | "TripPackingList"
  | "TripPackingListItemStatus"
  | "TripTask"
  | "MealPlanDay"
  | "MealPlanItem"
  | "MealPlanDayItem"
  | "Notification"
  | "User"
  | "PublicMealItem"
  | "Image"
>;

const generators = {
  AccountSetting: makeAccountSetting,
  AccountSettingValue: makeAccountSettingValue,
  Feedback: makeFeedback,
  FeedbackAuditLog: makeFeedbackAuditLog,
  FeedbackNote: makeFeedbackNote,
  GearCategory: makeGearCategory,
  GearInventoryItem: makeGearInventoryItem,
  PackingList: makePackingList,
  PackingListSection: makePackingListSection,
  PackingListItem: makePackingListItem,
  Place: makePlace,
  Session: makeSession,
  Trip: makeTrip,
  TripLink: makeTripLink,
  TripPackingList: makeTripPackingList,
  TripPackingListItemStatus: makeTripPackingListItemStatus,
  TripTask: makeTripTask,
  MealPlanDay: makeMealPlanDay,
  MealPlanItem: makeMealPlanItem,
  MealPlanDayItem: makeMealPlanDayItem,
  Notification: makeNotification,
  User: makeUser,
  PublicMealItem: makePublicMealItem,
  Image: makeImage,
} as const;

export function make<Model extends SupportedModels>(
  model: Model,
  options?: Parameters<(typeof generators)[Model]>[0],
): ReturnType<(typeof generators)[Model]> {
  const generator = generators[model] as (
    options?: Parameters<(typeof generators)[Model]>[0],
  ) => ReturnType<(typeof generators)[Model]>;
  return generator(options);
}
