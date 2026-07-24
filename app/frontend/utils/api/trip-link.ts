import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientFullTrip } from "$/transformers/trip";
import type { ClientTripLink } from "$/transformers/trip-link";
import type { createLink, editLink } from "$/validation/trip/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export function useCreateTripLink(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (data: z.input<typeof createLink>) =>
      apiClient<{ link: ClientTripLink }>(`/api/trips/${tripId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: ({ link }) => {
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old ? { trip: { ...old.trip, links: [...old.trip.links, link] } } : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateTripLink(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      linkId,
      ...data
    }: z.input<typeof editLink> & { linkId: string }) =>
      apiClient<{ link: ClientTripLink }>(
        `/api/trips/${tripId}/links/${linkId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ linkId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                links: old.trip.links.map((link) =>
                  link.id === linkId ? { ...link, ...data } : link,
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

export function useDeleteTripLink(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (linkId: string) =>
      apiClient(`/api/trips/${tripId}/links/${linkId}`, { method: "DELETE" }),
    onMutate: async (linkId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                links: old.trip.links.filter((link) => link.id !== linkId),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _linkId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
