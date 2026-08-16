import AppLink from "$/frontend/app-link";
import { formatShortDate } from "$/frontend/utils/format-short-date";
import { getInitials } from "$/frontend/utils/get-initials";
import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import {
  Anchor,
  Avatar,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";

interface Props {
  feedback: ClientFullAdminFeedback;
}

function SidebarLabel({ children }: { children: string }) {
  return (
    <Text
      size="10px"
      fw={700}
      tt="uppercase"
      c="dimmed"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}

export default function MetaSidebar({ feedback }: Props) {
  return (
    <Paper withBorder p="md">
      <SidebarLabel>Submitted by</SidebarLabel>
      <Anchor
        component={AppLink}
        href={`/console/users?search=${encodeURIComponent(feedback.user.email)}&user=${feedback.user.id}`}
        underline="never"
        c="inherit"
        display="block"
      >
        <Group gap="sm" mt="xs" mb="md" wrap="nowrap">
          <Avatar radius="xl" size={34} color="bark-brown" variant="light">
            {getInitials(feedback.user.name)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text fw={700} size="sm" truncate>
              {feedback.user.name}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {feedback.user.email}
            </Text>
          </div>
        </Group>
      </Anchor>

      <Stack gap={4} mb="md">
        <SidebarLabel>Page</SidebarLabel>
        <Text size="xs" ff="monospace" style={{ wordBreak: "break-all" }}>
          {feedback.submittedOnPage}
        </Text>
      </Stack>

      <Stack gap={4}>
        <SidebarLabel>Submitted</SidebarLabel>
        <Text size="sm">{formatShortDate(feedback.createdAt)}</Text>
      </Stack>

      {feedback.duplicates.length > 0 && (
        <>
          <Divider my="md" />
          <SidebarLabel>
            {`Linked duplicates (${feedback.duplicates.length})`}
          </SidebarLabel>
          <Stack gap={6} mt="xs">
            {feedback.duplicates.map((duplicate) => (
              <Anchor
                key={duplicate.id}
                component={AppLink}
                href={`/console/feedback/${duplicate.id}`}
                size="xs"
              >
                {duplicate.text.length > 48
                  ? `${duplicate.text.slice(0, 48)}…`
                  : duplicate.text}
              </Anchor>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
