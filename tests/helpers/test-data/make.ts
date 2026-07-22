import { ModelName } from "../../../generated/prisma/internal/prismaNamespace";
import type { PickStringLiteral } from "../../../type-helpers";
import makeAccountSetting from "./generators/account-setting";
import makeAccountSettingValue from "./generators/account-setting-value";
import makeGearCategory from "./generators/gear-category";
import makeGearInventoryItem from "./generators/gear-inventory-item";
import makeMealPlanDay from "./generators/meal-plan-day";
import makeMealPlanItem from "./generators/meal-plan-item";
import makePackingList from "./generators/packing-list";
import makePackingListItem from "./generators/packing-list-item";
import makePackingListSection from "./generators/packing-list-section";
import makeSession from "./generators/session";
import makeTrip from "./generators/trip";
import makeTripTask from "./generators/trip-task";
import makeUser from "./generators/user";

type SupportedModels = PickStringLiteral<
  ModelName,
  | "AccountSetting"
  | "AccountSettingValue"
  | "GearInventoryItem"
  | "GearCategory"
  | "PackingList"
  | "PackingListSection"
  | "PackingListItem"
  | "Session"
  | "Trip"
  | "TripTask"
  | "MealPlanDay"
  | "MealPlanItem"
  | "User"
>;

const generators = {
  AccountSetting: makeAccountSetting,
  AccountSettingValue: makeAccountSettingValue,
  GearCategory: makeGearCategory,
  GearInventoryItem: makeGearInventoryItem,
  PackingList: makePackingList,
  PackingListSection: makePackingListSection,
  PackingListItem: makePackingListItem,
  Session: makeSession,
  Trip: makeTrip,
  TripTask: makeTripTask,
  MealPlanDay: makeMealPlanDay,
  MealPlanItem: makeMealPlanItem,
  User: makeUser,
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
