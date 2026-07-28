import { MEAL_ORDER } from "$/frontend/trip/meal-plan/helpers";
import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import type { ClientFullTrip } from "$/transformers/trip";
import type {
  createMealPlanDay,
  createMealPlanItem,
  editMealPlanDay,
  editMealPlanItem,
  editMealPlanItemStatus,
} from "$/validation/trip/meal-plan";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import type { MealName } from "../../../../generated/prisma/enums";
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

export function useUpdateMealPlanDay(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      dayNumber,
      ...data
    }: z.input<typeof editMealPlanDay> & { dayNumber: number }) =>
      apiClient<{ mealPlanDay: ClientMealPlanDay }>(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ dayNumber, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                mealPlan: old.trip.mealPlan.map((day) =>
                  day.dayNumber === dayNumber ? { ...day, ...data } : day,
                ),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteMealPlanDay(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (dayNumber: number) =>
      apiClient(`/api/trips/${tripId}/meal-plan/days/${dayNumber}`, {
        method: "DELETE",
      }),
    onMutate: async (dayNumber) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                mealPlan: old.trip.mealPlan.filter(
                  (day) => day.dayNumber !== dayNumber,
                ),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Rebuilds one day's `meals` record by flattening it, applying `updateItems`,
// and regrouping by meal — so an item that changes meal moves groups without
// each caller handling that case.
function updateDayItems(
  trip: ClientFullTrip,
  dayNumber: number,
  updateItems: (items: ClientMealPlanItem[]) => ClientMealPlanItem[],
): ClientFullTrip {
  return {
    ...trip,
    mealPlan: trip.mealPlan.map((day) => {
      if (day.dayNumber !== dayNumber) return day;
      const items = updateItems(MEAL_ORDER.flatMap((meal) => day.meals[meal]));
      return {
        ...day,
        meals: Object.fromEntries(
          MEAL_ORDER.map((meal) => [
            meal,
            items.filter((item) => item.meal === meal),
          ]),
        ) as ClientMealPlanDay["meals"],
      };
    }),
  };
}

export const mealPlanItemSearchKeys = {
  search: (tripId: string, query: string, meal: MealName) =>
    ["trips", tripId, "meal-plan", "items", "search", query, meal] as const,
};

// Autocomplete over the user's own previously-entered meal plan items (BTP-77),
// scoped to this trip's search endpoint and boosted toward the meal slot the
// search was opened from.
export function useMealPlanItemSearch(
  tripId: string,
  query: string,
  meal: MealName,
) {
  return useQuery({
    queryKey: mealPlanItemSearchKeys.search(tripId, query, meal),
    queryFn: () =>
      apiClient<{ items: ClientMealPlanItem[] }>(
        `/api/trips/${tripId}/meal-plan/items?query=${encodeURIComponent(query)}&meal=${meal}`,
      ).then((res) => res.items ?? []),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateMealPlanItem(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      dayNumber,
      ...data
    }: z.input<typeof createMealPlanItem> & { dayNumber: number }) =>
      apiClient<{ mealPlanItem: ClientMealPlanItem }>(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: ({ mealPlanItem }, { dayNumber }) => {
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: updateDayItems(old.trip, dayNumber, (items) => [
                ...items,
                mealPlanItem,
              ]),
            }
          : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateMealPlanItem(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      dayNumber,
      itemId,
      ...data
    }: z.input<typeof editMealPlanItem> & {
      dayNumber: number;
      itemId: string;
    }) =>
      apiClient<{ mealPlanItem: ClientMealPlanItem }>(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ dayNumber, itemId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: updateDayItems(old.trip, dayNumber, (items) =>
                items.map((item) =>
                  item.id === itemId ? { ...item, ...data } : item,
                ),
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateMealPlanItemPackingStatus(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      dayNumber,
      itemId,
      ...data
    }: z.input<typeof editMealPlanItemStatus> & {
      dayNumber: number;
      itemId: string;
    }) =>
      apiClient<{ item: ClientMealPlanItem }>(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}/items/${itemId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ dayNumber, itemId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: updateDayItems(old.trip, dayNumber, (items) =>
                items.map((item) =>
                  item.id === itemId
                    ? { ...item, status: { ...item.status, ...data } }
                    : item,
                ),
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteMealPlanItem(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      dayNumber,
      itemId,
    }: {
      dayNumber: number;
      itemId: string;
    }) =>
      apiClient(
        `/api/trips/${tripId}/meal-plan/days/${dayNumber}/items/${itemId}`,
        { method: "DELETE" },
      ),
    onMutate: async ({ dayNumber, itemId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: updateDayItems(old.trip, dayNumber, (items) =>
                items.filter((item) => item.id !== itemId),
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
