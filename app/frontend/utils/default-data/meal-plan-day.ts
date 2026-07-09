import type { ITXClientDenyList } from "@prisma/client/runtime/client";
import { DateTime } from "luxon";
import type { Trip } from "../../../../generated/prisma/browser";
import type { PrismaClient } from "../../../../generated/prisma/client";

export async function createDefaultMealPlan(
  trip: Trip,
  transaction: Omit<PrismaClient, ITXClientDenyList>,
) {
  const firstDate = trip.start ? DateTime.fromJSDate(trip.start) : null;
  const daysToCreate = getNumberOfMealPlanDays(trip);

  for (let day = 1; day < daysToCreate + 1; day++) {
    await transaction.mealPlanDay.create({
      data: {
        tripId: trip.id,
        dayNumber: day,
        date: firstDate
          ? firstDate.plus({ days: day - 1 }).toJSDate()
          : undefined,
      },
    });
  }
}

function getNumberOfMealPlanDays(trip: Trip) {
  if (!trip.start || !trip.end) {
    return 1;
  }

  const start = DateTime.fromJSDate(trip.start);
  const end = DateTime.fromJSDate(trip.end);
  return Math.max(end.diff(start, "days").days, 1);
}
