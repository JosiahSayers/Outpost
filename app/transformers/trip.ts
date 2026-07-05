import type { Trip } from "../../generated/prisma/browser";

// TODO: Change start and end to strings since that's what they will serialize to
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
