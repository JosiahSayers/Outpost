import type { newTrip } from "$/validation/trip";
import type z from "zod";
import type { TripTaskCreateManyTripInput } from "../../../../generated/prisma/models";

export function prepareDefaultTripTasks(
  newTripData: z.infer<typeof newTrip>,
): TripTaskCreateManyTripInput[] {
  const twoDaysBeforeStart = getDateOffset(newTripData.start, -2);
  const oneDayBeforeStart = getDateOffset(newTripData.start, -1);

  const newTasks: TripTaskCreateManyTripInput[] = [
    // before
    {
      name: "Share trip plan with emergency contact",
      phase: "before",
      dueDate: twoDaysBeforeStart,
    },
    {
      name: "Check weather forecast",
      phase: "before",
      dueDate: twoDaysBeforeStart,
    },
    {
      name: "Pack backpack",
      phase: "before",
      dueDate: oneDayBeforeStart,
    },

    // during
    { name: "Leave copy of trip plan in vehicle", phase: "during" },

    // after
    { name: "Post trip report", phase: "after" },
    { name: "Unpack", phase: "after" },
  ];

  return newTasks;
}

function getDateOffset(date: Date | null | undefined, offset: number) {
  if (!date) {
    return date;
  }

  const parsedDate = new Date(date);
  parsedDate.setDate(parsedDate.getDate() + offset);
  return parsedDate;
}
