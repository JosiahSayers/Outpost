import { db } from "$/utils/db";
import { initialAccountSettings } from "./account-settings/initial-account-settings";
import { mealPlanReminderNotification } from "./account-settings/meal-plan-reminder-notification";
import { notificationAccountSettings } from "./account-settings/notifications";
import { weightRollupSetting } from "./account-settings/weight-rollup-setting";
import { weightRollupSettingDescriptionFix } from "./account-settings/weight-rollup-setting-description-fix";
import { publicGearCategories } from "./gear-categories";
import { gearCategoryKeywords } from "./gear-category-keywords";
import { reiPackingList } from "./packing-lists/rei-packing-list";
import { reiWinterBackcountryCampingChecklist } from "./packing-lists/rei-winter-backcountry-camping-checklist";

const productionSeeds = [
  publicGearCategories,
  reiPackingList,
  reiWinterBackcountryCampingChecklist,
  initialAccountSettings,
  weightRollupSetting,
  weightRollupSettingDescriptionFix,
  gearCategoryKeywords,
  notificationAccountSettings,
  mealPlanReminderNotification,
];

export default async function applyProductionSeeds() {
  for (const seed of productionSeeds) {
    const alreadyApplied = await db.appliedSeeds.findUnique({
      where: { name: seed.name },
    });
    if (alreadyApplied !== null) {
      console.log(`Skipping ${seed.name}`);
      continue;
    }

    try {
      await seed.run();
      await db.appliedSeeds.create({ data: { name: seed.name } });
      console.log(`Applied ${seed.name}`);
    } catch (e) {
      console.error(`Failed to apply seed: ${seed.name}`, e);
    }
  }
}
