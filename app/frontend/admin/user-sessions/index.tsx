import DeviceCell from "$/frontend/admin/user-sessions/device-cell";
import { formatSessionDate } from "$/frontend/admin/user-sessions/format-date";
import SessionRowMenu from "$/frontend/admin/user-sessions/session-row-menu";
import SessionStatusBadge from "$/frontend/admin/user-sessions/session-status-badge";
import {
  useAdminUserSessions,
  type SessionStatusFilter,
} from "$/frontend/utils/api/admin-sessions";
import { ApiError } from "$/frontend/utils/api/client";
import {
  Anchor,
  Badge,
  Center,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { ArrowLeftIcon, EyeIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation } from "wouter";

interface UserSessionsProps {
  userId: string;
}

function isActive(expiresAt: Date | string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}

export default function UserSessions({ userId }: UserSessionsProps) {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<SessionStatusFilter>("active");
  const { data, isPending, isError, error } = useAdminUserSessions(
    userId,
    status,
  );
  const notFound = error instanceof ApiError && error.status === 404;

  const sessions = data?.sessions ?? [];

  function goBackToSearch() {
    // Prefer a real back-navigation so the search page restores exactly the
    // search term and selection it had before — falls back to a fresh
    // navigation if this page was opened directly (no history to pop).
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/console/users");
    }
  }

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <div>
        <Anchor
          component="button"
          type="button"
          onClick={goBackToSearch}
          underline="never"
          c="dimmed"
          fw={600}
          fz="sm"
          display="inline-flex"
          mb="xs"
          style={{ alignItems: "center", gap: 6 }}
        >
          <ArrowLeftIcon size={14} />
          Back to user search
        </Anchor>
        <Title order={2}>Sessions</Title>
        <Text c="dimmed" size="sm">
          Every sign-in for this account, across devices and IP addresses.
        </Text>
      </div>

      {notFound ? (
        <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
          <Text ta="center" fw={700}>
            This account no longer exists
          </Text>
          <Text ta="center" c="dimmed" size="sm" mt={4}>
            It may have been deleted, or the link may be out of date.
          </Text>
        </Paper>
      ) : (
        <>
          <SegmentedControl
            value={status}
            onChange={(value) => setStatus(value as SessionStatusFilter)}
            data={[
              { label: "Active", value: "active" },
              { label: "Expired", value: "expired" },
              { label: "All", value: "all" },
            ]}
            w={{ base: "100%", sm: "auto" }}
          />

          {isPending && (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          )}

          {isError && (
            <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
              <Text ta="center" c="dimmed">
                Couldn&rsquo;t load sessions for this account.
              </Text>
            </Paper>
          )}

          {!isPending && !isError && sessions.length === 0 && (
            <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
              <Text ta="center" fw={700}>
                No {status === "all" ? "" : status} sessions
              </Text>
              <Text ta="center" c="dimmed" size="sm" mt={4}>
                This account has no {status === "all" ? "" : status} sessions to
                show.
              </Text>
            </Paper>
          )}

          {!isPending && !isError && sessions.length > 0 && (
            <Paper withBorder>
              <Table.ScrollContainer minWidth={720}>
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Device</Table.Th>
                      <Table.Th>IP Address</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Impersonation</Table.Th>
                      <Table.Th>Last active</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sessions.map((session) => (
                      <Table.Tr
                        key={session.id}
                        bg={session.impersonatedBy ? "bark-brown.0" : undefined}
                      >
                        <Table.Td>
                          <DeviceCell userAgent={session.userAgent} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {session.ipAddress ?? "—"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <SessionStatusBadge expiresAt={session.expiresAt} />
                        </Table.Td>
                        <Table.Td>
                          {session.impersonatedBy ? (
                            <Tooltip
                              label={`Admin id: ${session.impersonatedBy}`}
                            >
                              <Badge
                                color="bark-brown"
                                leftSection={<EyeIcon size={12} />}
                              >
                                Impersonated
                              </Badge>
                            </Tooltip>
                          ) : (
                            <Text size="xs" c="dimmed">
                              &mdash;
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {formatSessionDate(session.updatedAt)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Started {formatSessionDate(session.createdAt)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {isActive(session.expiresAt) ? (
                            <SessionRowMenu
                              userId={userId}
                              sessionId={session.id}
                            />
                          ) : null}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}
