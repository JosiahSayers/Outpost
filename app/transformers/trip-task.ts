import { toDateOnly } from "$/transformers/helpers";
import type { TripTask } from "../../generated/prisma/browser";

export type ClientTripTask = Pick<
  TripTask,
  "id" | "name" | "complete" | "phase"
> & { dueDate: string | null };

export function transform(item: TripTask): ClientTripTask {
  return {
    id: item.id,
    name: item.name,
    complete: item.complete,
    phase: item.phase,
    dueDate: toDateOnly(item.dueDate),
  };
}
