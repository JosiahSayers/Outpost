import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import NotificationToggleCard from "$/frontend/account/notifications-panel/notification-toggle-card";
import PushSubscriptionToggle from "$/frontend/account/notifications-panel/push-subscription-toggle";
import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { NOTIFICATION_SLUG_PREFIX, Notifications } from "$/utils/notifications";
import { Stack, Text, Title } from "@mantine/core";
import {
  BellIcon,
  FlagCheckeredIcon,
  ShoppingCartIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useMemo } from "react";

// A notification renders with a generic bell icon unless it has an entry
// here -- so a brand-new notification (seed entry + validation branches)
// shows up automatically, and a nicer icon is a purely cosmetic follow-up.
const ICONS_BY_NOTIFICATION: Partial<Record<string, Icon>> = {
  trip_status_update: FlagCheckeredIcon,
  meal_plan_unpurchased_items: ShoppingCartIcon,
};

interface NotificationGroup {
  notification: string;
  title: string;
}

// Account setting names follow "<title> - In-App"/"<title> - Email" (see
// prisma/seeds/production/account-settings/notifications.ts), so the shared
// title is recovered by dropping whichever channel suffix is present.
function groupNotifications(
  settings: ClientUserAccountSetting[],
): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const setting of settings) {
    const parsed = Notifications.parseSlug(setting.slug);
    if (!parsed || groups.has(parsed.notification)) continue;
    groups.set(parsed.notification, {
      notification: parsed.notification,
      title: setting.name.split(" - ")[0] ?? setting.name,
    });
  }
  return [...groups.values()];
}

export default function NotificationsPanel() {
  const { settings, isPending } = useAccountSettingsContext();
  const notificationSettings = useMemo(
    () =>
      settings?.filter((setting) =>
        setting.slug.startsWith(NOTIFICATION_SLUG_PREFIX),
      ) ?? [],
    [settings],
  );
  const notifications = useMemo(
    () => groupNotifications(notificationSettings),
    [notificationSettings],
  );

  return (
    <LoadingSwitch loading={isPending}>
      {() => (
        <Stack gap="md">
          <Title order={3}>Notifications</Title>
          <Text c="dimmed" size="sm">
            Choose how you want to hear from Outpost for each type of update.
          </Text>

          <PushSubscriptionToggle />

          <Stack gap="md">
            {notifications.map(({ notification, title }) => (
              <NotificationToggleCard
                key={notification}
                notification={notification}
                title={title}
                icon={ICONS_BY_NOTIFICATION[notification] ?? BellIcon}
                settings={notificationSettings}
              />
            ))}
          </Stack>
        </Stack>
      )}
    </LoadingSwitch>
  );
}
