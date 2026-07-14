import AppLink from "$/frontend/app-link";
import MarmotAvatar from "$/frontend/layout/app-shell/marmot-avatar";
import { getInitials } from "$/frontend/utils/get-initials";
import {
  Avatar,
  Box,
  Divider,
  Group,
  Menu,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import { GearIcon, SignOutIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "wouter";

interface AccountMenuProps {
  name: string;
  email: string;
  stacked?: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
}

const appearanceData = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "auto" },
];

export default function AccountMenu({
  name,
  email,
  stacked,
  onNavigate,
  onSignOut,
}: AccountMenuProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [menuOpened, setMenuOpened] = useState(false);

  const identity = (
    <Group gap="sm" wrap="nowrap">
      <Avatar radius="xl" size={30} color="stone-gray" variant="filled">
        {getInitials(name)}
      </Avatar>
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="sm" fw={600} truncate>
          {name}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {email}
        </Text>
      </Stack>
    </Group>
  );

  const appearance = (
    <Stack gap={6}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        Appearance
      </Text>
      <SegmentedControl
        size="xs"
        fullWidth
        value={colorScheme}
        onChange={(value) => setColorScheme(value as "light" | "dark" | "auto")}
        data={appearanceData}
      />
    </Stack>
  );

  if (stacked) {
    return (
      <Stack gap="md" w="100%">
        {identity}
        <Divider />
        <Box onClick={onNavigate}>
          <Group gap="xs">
            <GearIcon size={16} />
            <AppLink href="/account">Account Settings</AppLink>
          </Group>
        </Box>
        {appearance}
        <Divider />
        <UnstyledButton
          onClick={() => {
            onSignOut();
            onNavigate?.();
          }}
        >
          <Group gap="xs">
            <SignOutIcon size={16} />
            <Text size="sm">Sign Out</Text>
          </Group>
        </UnstyledButton>
      </Stack>
    );
  }

  return (
    <Menu
      shadow="md"
      width={240}
      position="bottom-end"
      opened={menuOpened}
      onChange={setMenuOpened}
    >
      <Menu.Target>
        <UnstyledButton
          aria-label="Account menu"
          style={{ borderRadius: "50%", cursor: "pointer" }}
        >
          <MarmotAvatar winking={menuOpened} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Box px="sm" py={6}>
          {identity}
        </Box>
        <Menu.Divider />
        <Menu.Item
          component={Link}
          href="/account"
          leftSection={<GearIcon size={16} />}
        >
          Account Settings
        </Menu.Item>
        <Box px="sm" pt={4} pb={2}>
          {appearance}
        </Box>
        <Menu.Divider />
        <Menu.Item leftSection={<SignOutIcon size={16} />} onClick={onSignOut}>
          Sign Out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
