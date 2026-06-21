export type TripStatus = "planning" | "upcoming" | "completed";
export type ListStatus = "not-started" | "in-progress" | "complete";

export interface PackingListSummary {
  id: string;
  name: string;
  itemCount: number;
  status: ListStatus;
}

export interface Trip {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  packingLists: PackingListSummary[];
}

export interface StandaloneList {
  id: string;
  name: string;
  itemCount: number;
  totalWeightKg: number;
}

export interface GearSummary {
  totalItems: number;
  totalWeightKg: number;
  categoryCount: number;
}
