import type {
  ClientAdminFeedback,
  ClientAdminFeedbackListItem,
  ClientFullAdminFeedback,
} from "$/transformers/admin/feedback";
import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import type {
  createFeedbackNote,
  editFeedback,
  editFeedbackNote,
} from "$/validation/admin/feedback";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";
import { apiClient } from "./client";

export interface AdminFeedbackListResult {
  feedback: ClientAdminFeedbackListItem[];
  total: number;
  pageSize: number;
}

export const adminFeedbackKeys = {
  all: ["admin", "feedback"] as const,
  lists: () => [...adminFeedbackKeys.all, "list"] as const,
  // Sorted so the cache key is stable regardless of the order statuses were
  // toggled on in the filter bar.
  list: (status: FeedbackStatus[], skip: number, take: number) =>
    [...adminFeedbackKeys.lists(), [...status].sort(), skip, take] as const,
  details: () => [...adminFeedbackKeys.all, "detail"] as const,
  detail: (id: string) => [...adminFeedbackKeys.details(), id] as const,
};

export function useAdminFeedbackList(
  status: FeedbackStatus[],
  skip: number,
  take: number,
) {
  return useQuery({
    queryKey: adminFeedbackKeys.list(status, skip, take),
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(take),
      });
      status.forEach((s) => params.append("status", s));
      return apiClient<AdminFeedbackListResult>(`/admin/feedback?${params}`);
    },
  });
}

export function useAdminFeedbackDetail(id: string) {
  return useQuery({
    queryKey: adminFeedbackKeys.detail(id),
    queryFn: () =>
      apiClient<{ feedback: ClientFullAdminFeedback }>(`/admin/feedback/${id}`),
  });
}

function updateDetailCache(
  queryClient: QueryClient,
  id: string,
  updater: (feedback: ClientFullAdminFeedback) => ClientFullAdminFeedback,
) {
  queryClient.setQueryData<{ feedback: ClientFullAdminFeedback }>(
    adminFeedbackKeys.detail(id),
    (old) => (old ? { feedback: updater(old.feedback) } : old),
  );
}

export function useUpdateFeedbackStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: z.input<typeof editFeedback>) =>
      apiClient<{ feedback: ClientAdminFeedback }>(`/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: ({ feedback }) => {
      // Updates the badge/select immediately; the fuller refetch below picks
      // up the audit-log entry the server writes for this status change.
      updateDetailCache(queryClient, id, (old) => ({
        ...old,
        status: feedback.status,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminFeedbackKeys.detail(id) });
      // A status change can move this item in or out of whatever the list
      // screen's current filter is, so every cached list page is suspect.
      queryClient.invalidateQueries({ queryKey: adminFeedbackKeys.lists() });
    },
  });
}

export function useCreateFeedbackNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: z.input<typeof createFeedbackNote>) =>
      apiClient<{ note: ClientAdminFeedbackNote }>(
        `/admin/feedback/${id}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: ({ note }) => {
      updateDetailCache(queryClient, id, (old) => ({
        ...old,
        notes: [note, ...old.notes],
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminFeedbackKeys.detail(id) });
    },
  });
}

export function useUpdateFeedbackNote(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      noteId,
      ...data
    }: z.input<typeof editFeedbackNote> & { noteId: string }) =>
      apiClient<{ note: ClientAdminFeedbackNote }>(
        `/admin/feedback/${id}/notes/${noteId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onSuccess: ({ note }) => {
      updateDetailCache(queryClient, id, (old) => ({
        ...old,
        notes: old.notes.map((n) => (n.id === note.id ? note : n)),
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminFeedbackKeys.detail(id) });
    },
  });
}
