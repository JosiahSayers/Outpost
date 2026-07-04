import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";

export async function createTrips() {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });

  await db.trip.createMany({
    data: [
      make("Trip", { userId: user.id }),
      make("Trip", { userId: user.id }),
      make("Trip", { userId: user.id }),
      make("Trip", { userId: user.id }),
      make("Trip", { userId: user.id }),
    ],
  });
}
