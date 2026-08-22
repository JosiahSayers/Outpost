import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { computeDefaultPushSettingUpdates } from "$/frontend/account/notifications-panel/enable-default-push-settings";
import { IOS_INSTALL_COPY } from "$/frontend/shared-components/install-ios-banner";
import { useUpdateAccountSettings } from "$/frontend/utils/api/account-settings";
import {
  checkPushSubscription,
  useSubscribeToPush,
  useUnsubscribeFromPush,
} from "$/frontend/utils/api/push-subscriptions";
import { notifyError } from "$/frontend/utils/notify-error";
import { isIos, isStandalone } from "$/frontend/utils/platform";
import { Card, Group, Switch, Text, ThemeIcon, Title } from "@mantine/core";
import { DeviceMobileIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type SubscriptionState =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "subscribed"
  | "unsubscribed"
  | "denied";

// Standard VAPID-key conversion boilerplate -- pushManager.subscribe()
// wants the application server key as a Uint8Array, not the base64url
// string BUN_PUBLIC_VAPID_PUBLIC_KEY carries.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

// Shared by the manual toggle-on flow and the mount-time auto-heal flow
// below -- requests permission, subscribes, and upserts to the server.
// Returns null (rather than throwing) when permission isn't granted, since
// that's an expected outcome both callers need to branch on, not a bug.
async function subscribeAndUpsert(
  registration: ServiceWorkerRegistration,
  subscribe: ReturnType<typeof useSubscribeToPush>,
  onError?: (error: Error) => void,
) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY,
    ),
  });
  await subscribe.mutateAsync(
    {
      ...subscription.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    { onError },
  );
  return subscription;
}

// A separate axis from the per-notification "Push" toggles below -- this is
// the browser-level subscription (one per device), while those are an
// account-wide content preference. A per-notification push toggle still has
// no effect on a device that's never subscribed, same as how the email/
// in-app toggles don't check anything about mailbox or browser state either.
// The one place they touch: turning this switch on seeds sensible defaults
// via computeDefaultPushSettingUpdates (below), so enabling push doesn't
// leave every per-notification card looking unchanged and off.
export default function PushSubscriptionToggle() {
  const [state, setState] = useState<SubscriptionState>("loading");
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();
  const { settings } = useAccountSettingsContext();
  const updateSettings = useUpdateAccountSettings();

  useEffect(() => {
    if (isIos() && !isStandalone()) {
      setState("ios-needs-install");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    (async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setState("unsubscribed");
        return;
      }

      let stillExists = true;
      try {
        stillExists = await checkPushSubscription(subscription.endpoint);
      } catch {
        // Inconclusive (network error, etc.) -- assume it's still good
        // rather than forcing a disruptive resubscribe on a guess.
      }

      if (stillExists) {
        setState("subscribed");
        return;
      }

      // The nightly stale-prune job deleted this subscription server-side
      // (see prune-stale-push-subscriptions.ts) -- silently redo what used
      // to require manually toggling off then on: force a fresh
      // negotiation with the push service (unsubscribe first, or
      // subscribe() can just hand back the same possibly-dead
      // registration) and re-register the new one.
      try {
        await subscription.unsubscribe();
        const newSubscription = await subscribeAndUpsert(
          registration,
          subscribe,
        );
        setState(newSubscription ? "subscribed" : "unsubscribed");
      } catch {
        setState("unsubscribed");
      }
    })();
  }, []);

  const handleToggle = async (checked: boolean) => {
    const registration = await navigator.serviceWorker.ready;

    if (!checked) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribe.mutateAsync(subscription.endpoint, {
          onError: notifyError("Couldn't disable push notifications"),
        });
        await subscription.unsubscribe();
      }
      setState("unsubscribed");
      return;
    }

    const subscription = await subscribeAndUpsert(
      registration,
      subscribe,
      notifyError("Couldn't enable push notifications"),
    );
    setState(subscription ? "subscribed" : "denied");

    // Only on this explicit, user-initiated enable -- not the mount-time
    // auto-heal resubscribe above, which shouldn't silently re-enable
    // per-notification settings the user may have turned off since.
    if (subscription && settings) {
      const updates = computeDefaultPushSettingUpdates(settings);
      if (updates.length > 0) {
        updateSettings.mutate(updates, {
          onError: notifyError("Couldn't update notification settings"),
        });
      }
    }
  };

  if (state === "unsupported") return null;

  if (state === "ios-needs-install") {
    return (
      <Card p={{ base: "sm", sm: "lg" }}>
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" radius="sm" size={30}>
            <DeviceMobileIcon size={16} />
          </ThemeIcon>
          <div>
            <Title order={4}>Push Notifications</Title>
            <Text c="dimmed" size="sm">
              {IOS_INSTALL_COPY.title} — install to your Home Screen to turn
              this on: {IOS_INSTALL_COPY.steps.join(", then ")}.
            </Text>
          </div>
        </Group>
      </Card>
    );
  }

  return (
    <Card p={{ base: "sm", sm: "lg" }}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" radius="sm" size={30}>
            <DeviceMobileIcon size={16} />
          </ThemeIcon>
          <div>
            <Title order={4}>Push Notifications</Title>
            <Text c="dimmed" size="sm">
              {state === "denied"
                ? "Blocked in your browser settings -- enable notifications for this site to turn this back on."
                : "Enable push notifications on this device. Types you already get in-app or by email will switch on automatically -- turn on any others below."}
            </Text>
          </div>
        </Group>
        <Switch
          checked={state === "subscribed"}
          disabled={state === "loading"}
          onChange={(event) => handleToggle(event.currentTarget.checked)}
        />
      </Group>
    </Card>
  );
}
