import { toDateOnly } from "$/transformers/helpers";
import {
  transform as tripTaskTransform,
  type ClientTripTask,
} from "$/transformers/trip-task";
import type { Trip, TripTask } from "../../generated/prisma/browser";
import {
  transform as mealPlanDayTransform,
  type ClientMealPlanDay,
  type FullMealPlanDayInput,
} from "./meal-plan/day";

export type ClientTrip = Omit<
  Pick<Trip, "id" | "name" | "trail" | "location" | "status" | "start" | "end">,
  "start" | "end"
> & {
  start: string | null;
  end: string | null;
};

export function transform(item: Trip): ClientTrip {
  return {
    id: item.id,
    name: item.name,
    trail: item.trail,
    location: item.location,
    status: item.status,
    start: toDateOnly(item.start),
    end: toDateOnly(item.end),
  };
}

export type ClientFullTrip = ClientTrip & {
  tasks: Array<ClientTripTask>;
  mealPlan: ClientMealPlanDay[];
};

type FullTrip = Trip & {
  tasks: TripTask[];
  mealPlanDays: FullMealPlanDayInput[];
};

export function transformFull(item: FullTrip): ClientFullTrip {
  return {
    ...transform(item),
    tasks: item.tasks.map(tripTaskTransform),
    mealPlan: item.mealPlanDays.map(mealPlanDayTransform),
  };
}
