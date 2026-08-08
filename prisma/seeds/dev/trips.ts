import { createDefaultMealPlan } from "$/frontend/utils/default-data/meal-plan-day";
import { prepareDefaultTripTasks } from "$/frontend/utils/default-data/trip-tasks";
import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";
import { seedMealPlanItems } from "./meal-plan-items";

export async function createTrips() {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });

  const trips = [
    make("Trip", { userId: user.id }),
    make("Trip", { userId: user.id }),
    make("Trip", { userId: user.id }),
    make("Trip", { userId: user.id }),
    make("Trip", { userId: user.id }),
  ];

  for (const trip of trips) {
    await db.trip.create({
      data: {
        ...trip,
        tasks: {
          createMany: {
            data: prepareDefaultTripTasks(trip as any),
          },
        },
      },
    });

    await createDefaultMealPlan(trip, db);

    const mealPlanDays = await db.mealPlanDay.findMany({
      where: { tripId: trip.id },
      orderBy: { dayNumber: "asc" },
    });

    for (const day of mealPlanDays) {
      await seedMealPlanItems(day, user.id);
    }

    await db.tripLink.createMany({
      data: [
        make("TripLink", {
          tripId: trip.id,
          url: "https://www.nps.gov/mora/index.htm",
          name: "Mount Rainier National Park",
          description:
            "Home to the most glaciated peak in the contiguous United States, Mount Rainier National Park showcases subalpine wildflower meadows.",
          imageUrl: null,
          siteName: "National Park Service",
          type: "website",
        }),
        make("TripLink", {
          tripId: trip.id,
          url: "https://www.rei.com/learn/expert-advice/backpacking-checklist.html",
          name: null,
          description: null,
          imageUrl: null,
          siteName: null,
          type: null,
        }),
      ],
    });
  }
}
