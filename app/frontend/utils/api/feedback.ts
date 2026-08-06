import type { createFeedback } from "$/validation/feedback";
import { useMutation } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (data: z.input<typeof createFeedback>) =>
      apiClient<{ referenceId: string }>("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
