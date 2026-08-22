import {
  useSubscribeToPush,
  useUnsubscribeFromPush,
} from "$/frontend/utils/api/push-subscriptions";
import { notifyError } from "$/frontend/utils/notify-error";
import { Card, Group, Switch, Text, ThemeIcon, Title } from "@mantine/core";
import { DeviceMobileIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type SubscriptionState =
  "loading" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

// Standard VAPID-key conversion boilerplate -- pushManager.subscribe()
// wants the application server key as a Uint8Array, not the base64url
// string BUN_PUBLIC_VAPID_PUBLIC_KEY carries.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

// A separate axis from the per-notification "Push" toggles below -- this is
// the browser-level subscription (one per device), while those are an
// account-wide content preference. They're intentionally not coupled: a
// per-notification push toggle has no effect on a device that's never
// subscribed, same as how the email/in-app toggles don't check anything
// about mailbox or browser state either.
export default function PushSubscriptionToggle() {
  const [state, setState] = useState<SubscriptionState>("loading");
  const subscribe = useSubscribeToPush();
  const unsubscribe = useUnsubscribeFromPush();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) =>
        setState(subscription ? "subscribed" : "unsubscribed"),
      );
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

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY,
      ),
    });
    await subscribe.mutateAsync(subscription.toJSON(), {
      onError: notifyError("Couldn't enable push notifications"),
    });
    setState("subscribed");
  };

  if (state === "unsupported") return null;

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
                : "Enable push notifications on this device. You'll still need to enable each notification type below."}
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
