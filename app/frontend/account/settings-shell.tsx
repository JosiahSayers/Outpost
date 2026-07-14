import ProfilePanel from "$/frontend/account/profile-panel";
import PreferencesPanel from "$/frontend/account/preferences-panel";
import { Badge, Box, Divider, Group, NavLink, Paper } from "@mantine/core";
import {
  BellIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

type SettingsTab = "profile" | "preferences";

interface SettingsShellProps {
  name: string;
  email: string;
}

export default function SettingsShell({ name, email }: SettingsShellProps) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <Paper withBorder>
      <Group align="stretch" gap={0} wrap="nowrap">
        <Box w={190} p="xs" flex="none">
          <NavLink
            label="Profile"
            leftSection={<UserIcon size={16} />}
            active={tab === "profile"}
            onClick={() => setTab("profile")}
          />
          <NavLink
            label="Preferences"
            leftSection={<SlidersHorizontalIcon size={16} />}
            active={tab === "preferences"}
            onClick={() => setTab("preferences")}
          />
          <NavLink
            label="Notifications"
            leftSection={<BellIcon size={16} />}
            rightSection={
              <Badge color="stone-gray" variant="light" size="xs">
                Soon
              </Badge>
            }
            disabled
          />
          <NavLink
            label="Privacy"
            leftSection={<ShieldIcon size={16} />}
            rightSection={
              <Badge color="stone-gray" variant="light" size="xs">
                Soon
              </Badge>
            }
            disabled
          />
        </Box>
        <Divider orientation="vertical" />
        <Box flex={1} p="xl" style={{ minWidth: 0 }}>
          {tab === "profile" ? (
            <ProfilePanel name={name} email={email} />
          ) : (
            <PreferencesPanel />
          )}
        </Box>
      </Group>
    </Paper>
  );
}
