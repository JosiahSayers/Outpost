import { tripKeys } from "$/frontend/utils/api/trip";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientFile } from "$/transformers/file";
import type { ClientFullTrip } from "$/transformers/trip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export function useUploadTripFile(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiClient<{ file: ClientFile }>(`/api/trips/${tripId}/files`, {
        method: "POST",
        body,
      });
    },
    onSuccess: ({ file }) => {
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old ? { trip: { ...old.trip, files: [...old.trip.files, file] } } : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteTripFile(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (fileId: string) =>
      apiClient(`/api/trips/${tripId}/files/${fileId}`, { method: "DELETE" }),
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                files: old.trip.files.filter((file) => file.id !== fileId),
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (error, _fileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // The optimistic removal above unmounts the calling FileRow
      // immediately, so an onError passed to mutate() at the call site never
      // fires — it has to live here instead to reliably notify on failure.
      notifyError("Couldn't delete file")(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
