import { toDateOnly } from "$/transformers/helpers";
import {
  transform as tripTaskTransform,
  type ClientTripTask,
} from "$/transformers/trip-task";
import type { Trip, TripLink, TripTask } from "../../generated/prisma/browser";
import {
  transform as mealPlanDayTransform,
  type ClientMealPlanDay,
  type FullMealPlanDayInput,
} from "./meal-plan/day";
import {
  transform as tripLinkTransform,
  type ClientTripLink,
} from "./trip-link";

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
  tasks: ClientTripTask[];
  mealPlan: ClientMealPlanDay[];
  links: ClientTripLink[];
};

type FullTrip = Trip & {
  tasks: TripTask[];
  mealPlanDays: FullMealPlanDayInput[];
  links: TripLink[];
};

export function transformFull(item: FullTrip): ClientFullTrip {
  return {
    ...transform(item),
    tasks: item.tasks.map(tripTaskTransform),
    mealPlan: item.mealPlanDays.map(mealPlanDayTransform),
    links: item.links.map(tripLinkTransform),
  };
}
