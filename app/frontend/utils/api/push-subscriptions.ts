import { useMutation } from "@tanstack/react-query";
import { ApiError, apiClient } from "./client";

export function useSubscribeToPush() {
  return useMutation({
    mutationFn: (subscription: PushSubscriptionJSON & { timezone?: string }) =>
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

// One-shot check invoked imperatively from the toggle's mount effect, not a
// mutation -- returns whether the server still has this subscription
// (rather than throwing on the expected 404) so the caller can reconcile
// against a row the nightly stale-prune job may have deleted.
export async function checkPushSubscription(
  endpoint: string,
): Promise<boolean> {
  try {
    await apiClient("/api/push-subscriptions/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return false;
    }
    throw err;
  }
}
