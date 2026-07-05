import type { ClientPackingList } from "$/transformers/packing-list";
import type { ClientTrip } from "$/transformers/trip";

export type TripStatus = ClientTrip["status"];

export type Trip = ClientTrip;

export type StandaloneList = Pick<ClientPackingList, "id" | "name"> & {
  itemCount: number;
  totalWeightKg: number;
};

export interface GearSummary {
  totalItems: number;
  totalWeightKg: number;
  categoryCount: number;
}
