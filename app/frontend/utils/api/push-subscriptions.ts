import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";

export function useSubscribeToPush() {
  return useMutation({
    mutationFn: (subscription: PushSubscriptionJSON) =>
      apiClient("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      }),
  });
}

export function useUnsubscribeFromPush() {
  return useMutation({
    mutationFn: (endpoint: string) =>
      apiClient("/api/push-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }),
  });
}
