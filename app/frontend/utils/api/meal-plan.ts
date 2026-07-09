import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientFullTrip } from "$/transformers/trip";
import type { createMealPlanDay } from "$/validation/trip/meal-plan";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export function useCreateMealPlanDay(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (data: z.input<typeof createMealPlanDay>) =>
      apiClient<{ mealPlanDay: ClientMealPlanDay }>(
        `/api/trips/${tripId}/meal-plan/days`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: ({ mealPlanDay }) => {
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                mealPlan: [...old.trip.mealPlan, mealPlanDay],
              },
            }
          : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
