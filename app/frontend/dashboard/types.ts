import type { ClientPackingList } from "$/transformers/packing-list";

export type StandaloneList = Pick<ClientPackingList, "id" | "name"> & {
  itemCount: number;
  totalWeightKg: number;
};

export interface GearSummary {
  totalItems: number;
  totalWeightKg: number;
  categoryCount: number;
}
