import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.create({
    data: {
      slug: Notifications.getSlug("meal_plan_unpurchased_items", "web_push"),
      name: "Unpurchased Meal Plan Items - Push",
      description:
        "Get a heads-up a few days before a trip if your meal plan still has items that need purchased.",
      defaultValue: "true",
    },
  });
}

export const mealPlanUnpurchasedItemsWebPushSetting: ProductionSeed = {
  run,
  name: "meal-plan-unpurchased-items-web-push-setting",
};
