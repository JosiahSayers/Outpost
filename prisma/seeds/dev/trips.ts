import { prepareDefaultTripTasks } from "$/frontend/utils/default-data/trip-tasks";
import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";

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
  }
}
