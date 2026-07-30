import NotificationBellIcon from "$/frontend/layout/app-shell/notification-bell-icon";
import NotificationPanelContent from "$/frontend/layout/app-shell/notification-panel-content";
import { ActionIcon, Menu } from "@mantine/core";
import { useState } from "react";

// Desktop-only: popover anchored under the bell, same mechanism as the
// account menu. The mobile equivalent (own trigger + left-side Drawer) lives
// in header.tsx directly, reusing NotificationPanelContent the same way
// HeaderLinks' stacked mode reuses AccountMenu's content.
export default function NotificationBell() {
  const [opened, setOpened] = useState(false);

  return (
    <Menu
      shadow="md"
      width={320}
      position="bottom-end"
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Notifications"
        >
          <NotificationBellIcon />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <NotificationPanelContent onNavigate={() => setOpened(false)} />
      </Menu.Dropdown>
    </Menu>
  );
}
