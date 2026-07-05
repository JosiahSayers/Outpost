import type { Trip } from "../../generated/prisma/browser";

export type ClientTrip = Omit<
  Pick<Trip, "id" | "name" | "trail" | "location" | "status" | "start" | "end">,
  "start" | "end"
> & {
  start: string | null;
  end: string | null;
};

function toDateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

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
