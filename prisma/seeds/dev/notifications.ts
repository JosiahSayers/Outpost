import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

export async function createNotifications() {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  const trips = await db.trip.findMany({
    where: { userId: user.id },
    take: 2,
  });
  const [firstTrip, secondTrip] = trips;

  await db.notification.createMany({
    data: [
      make("Notification", {
        userId: user.id,
        title: "Rae added 4 gear items to the shared list",
        description:
          "Tent stakes, water filter, and 2 more were added to the packing list.",
        icon: "PersonSimpleHikeIcon",
        referenceUrl: secondTrip ? `/trips/${secondTrip.id}` : null,
        read: false,
        dismissed: false,
        createdAt: minutesAgo(12),
      }),
      make("Notification", {
        userId: user.id,
        title: "Trip starts in 3 days — pack list is 40% complete",
        description: null,
        icon: "FlagCheckeredIcon",
        referenceUrl: firstTrip ? `/trips/${firstTrip.id}` : null,
        read: false,
        dismissed: false,
        createdAt: minutesAgo(2 * 60),
      }),
      make("Notification", {
        userId: user.id,
        title: "Dark mode is here",
        description: "Switch anytime from your account menu.",
        icon: null,
        referenceUrl: null,
        read: true,
        dismissed: false,
        createdAt: minutesAgo(24 * 60),
      }),
      make("Notification", {
        userId: user.id,
        title: "Jordan accepted your invite",
        description: null,
        icon: "FlagCheckeredIcon",
        referenceUrl: firstTrip ? `/trips/${firstTrip.id}` : null,
        read: true,
        dismissed: true,
        createdAt: minutesAgo(3 * 24 * 60),
      }),
    ],
  });
}
