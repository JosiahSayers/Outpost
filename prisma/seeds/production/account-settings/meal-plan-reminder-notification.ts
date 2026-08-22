import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.createMany({
    data: [
      {
        slug: Notifications.getSlug("meal_plan_unpurchased_items", "in_app"),
        name: "Unpurchased Meal Plan Items - In-App",
        description:
          "Get a heads-up a few days before a trip if your meal plan still has items marked as not purchased.",
        defaultValue: "true",
      },
      {
        slug: Notifications.getSlug("meal_plan_unpurchased_items", "email"),
        name: "Unpurchased Meal Plan Items - Email",
        description:
          "Get a heads-up a few days before a trip if your meal plan still has items marked as not purchased.",
        defaultValue: "false",
      },
    ],
  });
}

export const mealPlanReminderNotification: ProductionSeed = {
  run,
  name: "meal-plan-reminder-notification",
};
