import type { ClientPackingList } from "$/transformers/packing-list";
import type { ClientTrip } from "$/transformers/trip";

export type TripStatus = ClientTrip["status"];

// Dates travel over JSON as ISO strings, not `Date` instances, so override
// the transformer's Prisma-typed fields.
export type Trip = Omit<ClientTrip, "start" | "end"> & {
  start: string | null;
  end: string | null;
};

export type StandaloneList = Pick<ClientPackingList, "id" | "name"> & {
  itemCount: number;
  totalWeightKg: number;
};

export interface GearSummary {
  totalItems: number;
  totalWeightKg: number;
  categoryCount: number;
}
