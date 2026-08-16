import { tripKeys } from "$/frontend/utils/api/trip";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientFullTrip } from "$/transformers/trip";
import type { ClientTripPartyMember } from "$/transformers/trip-party-member";
import type {
  createPartyMember,
  editPartyMember,
} from "$/validation/trip/party-member";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export function useCreateTripPartyMember(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (data: z.input<typeof createPartyMember>) =>
      apiClient<{ partyMember: ClientTripPartyMember }>(
        `/api/trips/${tripId}/party-members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: ({ partyMember }) => {
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                partyMembers: [...old.trip.partyMembers, partyMember],
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

export function useUpdateTripPartyMember(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      memberId,
      ...data
    }: z.input<typeof editPartyMember> & { memberId: string }) =>
      apiClient<{ partyMember: ClientTripPartyMember }>(
        `/api/trips/${tripId}/party-members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ memberId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                partyMembers: old.trip.partyMembers.map((member) =>
                  member.id === memberId ? { ...member, ...data } : member,
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

export function useDeleteTripPartyMember(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient(`/api/trips/${tripId}/party-members/${memberId}`, {
        method: "DELETE",
      }),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                partyMembers: old.trip.partyMembers.filter(
                  (member) => member.id !== memberId,
                ),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (error, _memberId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // The optimistic removal above unmounts the calling row immediately, so
      // an onError passed to mutate() at the call site never fires — it has
      // to live here instead to reliably notify on failure (see trip-link.ts).
      notifyError("Couldn't remove party member")(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
