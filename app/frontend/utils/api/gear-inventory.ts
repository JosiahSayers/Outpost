import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const gearInventoryKeys = {
  all: ["gear-inventory"] as const,
};

export function useGearInventory() {
  return useQuery({
    queryKey: gearInventoryKeys.all,
    queryFn: () =>
      apiClient<{ items: ClientGearInventoryItem[] }>("/api/gear-inventory"),
  });
}
