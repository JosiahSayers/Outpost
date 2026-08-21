import ToggleRow from "$/frontend/account/notifications-panel/toggle-row";
import { useUpdateAccountSetting } from "$/frontend/utils/api/account-settings";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { Notifications } from "$/utils/notifications";
import { Card, Group, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import { BellIcon, EnvelopeIcon, type Icon } from "@phosphor-icons/react";

interface NotificationToggleCardProps {
  /** Base notification name, e.g. "trip_status_update" -- combined with
   * "in_app"/"email" via Notifications.getSlug to find this notification's
   * two settings in `settings`. */
  notification: string;
  title: string;
  icon: Icon;
  settings: ClientUserAccountSetting[];
}

// Handles matching and toggling both channel variants (in-app/email) of a
// single notification, so adding a new notification only means seeding its
// two account settings, adding their slugs to
// $/validation/account-settings, and rendering one more of these -- no
// per-notification lookup/mutation code to duplicate.
export default function NotificationToggleCard({
  notification,
  title,
  icon: CardIcon,
  settings,
}: NotificationToggleCardProps) {
  const updateSetting = useUpdateAccountSetting();

  const inAppSlug = Notifications.getSlug(notification, "in_app");
  const emailSlug = Notifications.getSlug(notification, "email");
  const inAppSetting = settings.find((setting) => setting.slug === inAppSlug);
  const emailSetting = settings.find((setting) => setting.slug === emailSlug);
  const inAppEnabled = inAppSetting?.value === "true";
  const emailEnabled = emailSetting?.value === "true";
  // Both rows carry the same description in the seed data -- fall back to
  // the email row's in case only one has loaded.
  const description = inAppSetting?.description ?? emailSetting?.description;

  const toggle = (slug: string, value: boolean) => {
    updateSetting.mutate(
      { slug, value: value ? "true" : "false" },
      { onError: notifyError("Couldn't update notification setting") },
    );
  };

  return (
    <Card p={{ base: "sm", sm: "lg" }}>
      <Group gap="sm" mb={6}>
        <ThemeIcon variant="light" radius="sm" size={30}>
          <CardIcon size={16} />
        </ThemeIcon>
        <Title order={4}>{title}</Title>
      </Group>
      <Text c="dimmed" size="sm" mb="md">
        {description}
      </Text>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ToggleRow
          icon={BellIcon}
          label="In-app"
          checked={inAppEnabled}
          onChange={() => toggle(inAppSlug, !inAppEnabled)}
        />
        <ToggleRow
          icon={EnvelopeIcon}
          label="Email"
          checked={emailEnabled}
          onChange={() => toggle(emailSlug, !emailEnabled)}
        />
      </SimpleGrid>
    </Card>
  );
}
