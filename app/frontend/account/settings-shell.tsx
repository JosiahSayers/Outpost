import PreferencesPanel from "$/frontend/account/preferences-panel";
import ProfilePanel from "$/frontend/account/profile-panel";
import { Badge, Box, Divider, Flex, NavLink, Paper } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  BellIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "wouter";

type SettingsTab = "profile" | "preferences";

const SETTINGS_TABS: SettingsTab[] = ["profile", "preferences"];

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return SETTINGS_TABS.includes(value as SettingsTab);
}

interface SettingsShellProps {
  name: string;
  email: string;
  tab?: string;
}

export default function SettingsShell({
  name,
  email,
  tab,
}: SettingsShellProps) {
  const activeTab: SettingsTab = isSettingsTab(tab) ? tab : "profile";
  const isWideLayout = useMediaQuery("(min-width: 48em)");
  const tabContent: Record<SettingsTab, ReactNode> = {
    profile: <ProfilePanel name={name} email={email} />,
    preferences: <PreferencesPanel />,
  } as const;

  return (
    <Paper withBorder>
      <Flex direction={{ base: "column", sm: "row" }} gap={0} align="stretch">
        <Box w={{ base: "100%", sm: 190 }} p="xs" flex="none">
          <NavLink
            component={Link}
            label="Profile"
            leftSection={<UserIcon size={16} />}
            active={activeTab === "profile"}
            to="/account/profile"
          />
          <NavLink
            component={Link}
            label="Preferences"
            leftSection={<SlidersHorizontalIcon size={16} />}
            active={activeTab === "preferences"}
            to="/account/preferences"
          />
          <NavLink
            component={Link}
            label="Notifications"
            leftSection={<BellIcon size={16} />}
            rightSection={
              <Badge color="stone-gray" variant="light" size="xs">
                Soon
              </Badge>
            }
            disabled
            to="/account/notifications"
          />
          <NavLink
            component={Link}
            label="Privacy"
            leftSection={<ShieldIcon size={16} />}
            rightSection={
              <Badge color="stone-gray" variant="light" size="xs">
                Soon
              </Badge>
            }
            disabled
            to="/account/privacy"
          />
        </Box>
        <Divider orientation={isWideLayout ? "vertical" : "horizontal"} />
        <Box flex={1} p="xl" style={{ minWidth: 0 }}>
          {tabContent[activeTab]}
        </Box>
      </Flex>
    </Paper>
  );
}
