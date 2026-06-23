import type { createGearInventoryItemValidator } from "$/validation/gear-inventory";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
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

export function useCreateGearInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.input<typeof createGearInventoryItemValidator>) =>
      apiClient<ClientGearInventoryItem>("/api/gear-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gearInventoryKeys.all });
    },
  });
}
