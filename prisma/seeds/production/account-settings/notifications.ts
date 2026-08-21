import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.createMany({
    data: [
      {
        slug: Notifications.getSlug("trip_status_update", "in_app"),
        name: "Trip Status Updates - In-App",
        description:
          "Outpost will automatically mark a trip as In Progress or Completed based on the start and end dates you provide. Enable this to get a notification when that happens.",
        defaultValue: "true",
      },
      {
        slug: Notifications.getSlug("trip_status_update", "email"),
        name: "Trip Status Updates - Email",
        description:
          "Outpost will automatically mark a trip as In Progress or Completed based on the start and end dates you provide. Enable this to get a notification when that happens.",
        defaultValue: "false",
      },
    ],
  });
}

export const notificationAccountSettings: ProductionSeed = {
  run,
  name: "notification-account-settings",
};
