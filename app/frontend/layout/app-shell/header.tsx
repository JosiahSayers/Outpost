import AppLogo from "$/frontend/layout/app-shell/app-logo";
import HeaderLinks from "$/frontend/layout/app-shell/header-links";
import MarmotAvatar from "$/frontend/layout/app-shell/marmot-avatar";
import NotificationBell from "$/frontend/layout/app-shell/notification-bell";
import NotificationBellIcon from "$/frontend/layout/app-shell/notification-bell-icon";
import NotificationPanelContent from "$/frontend/layout/app-shell/notification-panel-content";
import { authClient } from "$/frontend/utils/auth-client";
import { useNotificationArrivalAlert } from "$/frontend/utils/hooks/use-notification-arrival-alert";
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
  const { pulsing } = useNotificationArrivalAlert(!!session.data);

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
            {session.data && <NotificationBell pulse={pulsing} />}
            <HeaderLinks />
          </Group>
          {/* Grouped together (rather than as separate top-level items in the
              outer space-between Group) so they sit close to each other —
              otherwise space-between spreads its free space between every
              pair of items, leaving a large gap before the avatar/burger. */}
          <Group hiddenFrom="sm" gap="sm">
            {session.data ? (
              <>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Notifications"
                  onClick={toggleNotifications}
                >
                  <NotificationBellIcon pulse={pulsing} />
                </ActionIcon>
                <UnstyledButton
                  onClick={toggle}
                  aria-label="Toggle menu"
                  style={{ borderRadius: "50%", cursor: "pointer" }}
                >
                  <MarmotAvatar size={36} winking={opened} />
                </UnstyledButton>
              </>
            ) : (
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                aria-label="Toggle menu"
              />
            )}
          </Group>
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
