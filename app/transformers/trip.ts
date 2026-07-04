import type { Trip } from "../../generated/prisma/browser";

export type ClientTrip = Pick<
  Trip,
  "id" | "name" | "trail" | "location" | "status" | "start" | "end"
>;

export function transform(item: Trip): ClientTrip {
  return {
    id: item.id,
    name: item.name,
    trail: item.trail,
    location: item.location,
    status: item.status,
    start: item.start,
    end: item.end,
  };
}
