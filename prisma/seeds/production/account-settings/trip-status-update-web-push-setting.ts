import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { ProductionSeed } from "../production-seed";

async function run() {
  await db.accountSetting.create({
    data: {
      slug: Notifications.getSlug("trip_status_update", "web_push"),
      name: "Trip Status Updates - Push",
      description:
        "Outpost will automatically mark a trip as In Progress or Completed based on the start and end dates you provide. Enable this to get a push notification when that happens.",
      defaultValue: "true",
    },
  });
}

export const tripStatusUpdateWebPushSetting: ProductionSeed = {
  run,
  name: "trip-status-update-web-push-setting",
};
