import AppLogo from "$/frontend/layout/app-shell/app-logo";
import HeaderLinks from "$/frontend/layout/app-shell/header-links";
import MarmotAvatar from "$/frontend/layout/app-shell/marmot-avatar";
import NotificationBell from "$/frontend/layout/app-shell/notification-bell";
import NotificationBellIcon from "$/frontend/layout/app-shell/notification-bell-icon";
import NotificationPanelContent from "$/frontend/layout/app-shell/notification-panel-content";
import { authClient } from "$/frontend/utils/auth-client";
import {
  ActionIcon,
  AppShellHeader,
  Burger,
  Drawer,
  Group,
  Stack,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "wouter";

export default function Header() {
  const [opened, { toggle, close }] = useDisclosure(false);
  // Deliberately opposite the account/menu drawer above, which opens from
  // the right — a separate trigger and panel so the two don't fight over
  // the same drawer instance or open state.
  const [
    notificationsOpened,
    { toggle: toggleNotifications, close: closeNotifications },
  ] = useDisclosure(false);
  const session = authClient.useSession();
  const logoHref = session.data ? "/dashboard" : "/";

  return (
    <>
      <AppShellHeader>
        <Group
          px={{ base: "md", sm: "xl" }}
          justify="space-between"
          align="center"
          h="100%"
        >
          <Link href={logoHref}>
            <AppLogo height={50} style={{ cursor: "pointer" }} />
          </Link>
          <Group visibleFrom="sm">
            {session.data && <NotificationBell />}
            <HeaderLinks />
          </Group>
          {session.data && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              hiddenFrom="sm"
              aria-label="Notifications"
              onClick={toggleNotifications}
            >
              <NotificationBellIcon />
            </ActionIcon>
          )}
          {session.data ? (
            <UnstyledButton
              onClick={toggle}
              hiddenFrom="sm"
              aria-label="Toggle menu"
              style={{ borderRadius: "50%", cursor: "pointer" }}
            >
              <MarmotAvatar size={36} winking={opened} />
            </UnstyledButton>
          ) : (
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle menu"
            />
          )}
        </Group>
      </AppShellHeader>
      <Drawer
        opened={opened}
        onClose={close}
        title="Menu"
        position="right"
        size="xs"
      >
        <Stack>
          <HeaderLinks stacked onNavigate={close} />
        </Stack>
      </Drawer>
      <Drawer
        opened={notificationsOpened}
        onClose={closeNotifications}
        position="left"
        size="xs"
      >
        <NotificationPanelContent onNavigate={closeNotifications} />
      </Drawer>
    </>
  );
}
