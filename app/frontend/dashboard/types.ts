import type { ClientPackingList } from "$/transformers/packing-list";

export type TripStatus = "planning" | "upcoming" | "completed";
export type ListStatus = "not-started" | "in-progress" | "complete";

export type PackingListSummary = Pick<ClientPackingList, "id" | "name"> & {
  itemCount: number;
  status: ListStatus;
};

export interface Trip {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  packingLists: PackingListSummary[];
}

export type StandaloneList = Pick<ClientPackingList, "id" | "name"> & {
  itemCount: number;
  totalWeightKg: number;
};

export interface GearSummary {
  totalItems: number;
  totalWeightKg: number;
  categoryCount: number;
}
