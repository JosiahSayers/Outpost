import ToggleRow from "$/frontend/account/notifications-panel/toggle-row";
import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  BackpackIcon,
  BellIcon,
  EnvelopeIcon,
  FlagCheckeredIcon,
  type Icon,
  UserCheckIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

interface NotificationSetting {
  slug: string;
  name: string;
  description: string;
  icon: Icon;
  inApp: boolean;
  email: boolean;
}

// Placeholder settings for the two notification categories that don't have
// an account setting yet -- only trip_status_update is real (seeded by
// prisma/seeds/production/account-settings/notifications.ts). This panel
// isn't wired to any API yet; toggling only updates local state.
const INITIAL_SETTINGS: NotificationSetting[] = [
  {
    slug: "trip_status_update",
    name: "Trip Status Updates",
    description:
      "Outpost automatically marks your trip as In Progress or Completed based on your start and end dates.",
    icon: FlagCheckeredIcon,
    inApp: true,
    email: false,
  },
  {
    slug: "shared_gear_list_changes",
    name: "Shared Gear List Changes",
    description:
      "Get notified when someone adds or removes gear from a list you're sharing.",
    icon: BackpackIcon,
    inApp: true,
    email: true,
  },
  {
    slug: "trip_invites",
    name: "Trip Invites",
    description:
      "Get notified when someone accepts your invite to join a trip.",
    icon: UserCheckIcon,
    inApp: false,
    email: true,
  },
];

export default function NotificationsPanel() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);

  const toggle = (slug: string, channel: "inApp" | "email") => {
    setSettings((current) =>
      current.map((setting) =>
        setting.slug === slug
          ? { ...setting, [channel]: !setting[channel] }
          : setting,
      ),
    );
  };

  return (
    <Stack gap="md">
      <Title order={3}>Notifications</Title>
      <Text c="dimmed" size="sm">
        Choose how you want to hear from Outpost for each type of update.
      </Text>

      <Stack gap="md">
        {settings.map((setting) => (
          <Card key={setting.slug} p={{ base: "sm", sm: "lg" }}>
            <Group gap="sm" mb={6}>
              <ThemeIcon variant="light" radius="sm" size={30}>
                <setting.icon size={16} />
              </ThemeIcon>
              <Title order={4}>{setting.name}</Title>
            </Group>
            <Text c="dimmed" size="sm" mb="md" maw={560}>
              {setting.description}
            </Text>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
              <ToggleRow
                icon={BellIcon}
                label="In-app"
                checked={setting.inApp}
                onChange={() => toggle(setting.slug, "inApp")}
              />
              <ToggleRow
                icon={EnvelopeIcon}
                label="Email"
                checked={setting.email}
                onChange={() => toggle(setting.slug, "email")}
              />
            </SimpleGrid>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
