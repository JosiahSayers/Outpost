import AppLogo from "$/frontend/layout/app-shell/app-logo";
import NotificationBell from "$/frontend/layout/app-shell/notification-bell";
import { authClient } from "$/frontend/utils/auth-client";
import { useNotificationArrivalAlert } from "$/frontend/utils/hooks/use-notification-arrival-alert";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { Link } from "wouter";

export default function Topbar() {
  const session = authClient.useSession();
  const name = session.data?.user.name ?? "";
  const email = session.data?.user.email ?? "";
  // AdminShell only ever mounts Topbar once a session is confirmed (see
  // admin.page.tsx's guard), so unlike Header this doesn't need to gate on
  // session.data — and Topbar, like Header, is only ever mounted once, so
  // this can safely call the hook directly (see its comment on why calling
  // it twice would double up toasts).
  const { pulsing } = useNotificationArrivalAlert(true);

  return (
    <Group
      h="100%"
      px={{ base: "md", sm: "xl" }}
      justify="space-between"
      wrap="nowrap"
    >
      <Link href="/console">
        <Group gap={8} wrap="nowrap" style={{ cursor: "pointer" }}>
          <AppLogo height={26} />
          <Badge color="bark-brown" variant="light" size="sm">
            Admin
          </Badge>
        </Group>
      </Link>

      <Group gap="md" wrap="nowrap">
        <Link href="/dashboard">
          <Text size="sm" c="dimmed" style={{ cursor: "pointer" }}>
            ← Back to app
          </Text>
        </Link>
        <Stack gap={0} visibleFrom="sm" style={{ textAlign: "right" }}>
          <Text size="sm" fw={600} truncate>
            {name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {email}
          </Text>
        </Stack>
        <NotificationBell pulse={pulsing} />
      </Group>
    </Group>
  );
}
