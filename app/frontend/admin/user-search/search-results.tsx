import UserStatusBadge from "$/frontend/admin/user-search/user-status-badge";
import { formatJoinedDate } from "$/frontend/admin/user-search/format-date";
import { getInitials } from "$/frontend/utils/get-initials";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { Avatar, Group, Paper, Stack, Table, Text } from "@mantine/core";
import { CaretRightIcon } from "@phosphor-icons/react";

interface SearchResultsProps {
  results: ClientAdminUser[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  isWideLayout: boolean;
}

function ActivityLine({ user }: { user: ClientAdminUser }) {
  return (
    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
      {user.counts.trips} trips · {user.counts.gearInventoryItems} gear ·{" "}
      {user.counts.packingLists} lists
    </Text>
  );
}

export default function SearchResults({
  results,
  selectedUserId,
  onSelect,
  isWideLayout,
}: SearchResultsProps) {
  if (isWideLayout) {
    return (
      <Paper withBorder>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Joined</Table.Th>
              <Table.Th>Activity</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((user) => (
              <Table.Tr
                key={user.id}
                onClick={() => onSelect(user.id)}
                bg={user.id === selectedUserId ? "trail-green.0" : undefined}
                style={{ cursor: "pointer" }}
              >
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar
                      radius="xl"
                      size={34}
                      color="stone-gray"
                      variant="filled"
                    >
                      {getInitials(user.name)}
                    </Avatar>
                    <div>
                      <Text fw={700} size="sm">
                        {user.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <UserStatusBadge user={user} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatJoinedDate(user.createdAt)}</Text>
                </Table.Td>
                <Table.Td>
                  <ActivityLine user={user} />
                </Table.Td>
                <Table.Td>
                  <CaretRightIcon
                    size={14}
                    color="var(--mantine-color-dimmed)"
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    );
  }

  return (
    <Stack gap="sm">
      {results.map((user) => (
        <Paper
          key={user.id}
          withBorder
          p="sm"
          onClick={() => onSelect(user.id)}
          bg={user.id === selectedUserId ? "trail-green.0" : undefined}
          style={{ cursor: "pointer" }}
        >
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Avatar radius="xl" size={38} color="stone-gray" variant="filled">
              {getInitials(user.name)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <div style={{ minWidth: 0 }}>
                  <Text fw={700} size="sm" truncate>
                    {user.name}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {user.email}
                  </Text>
                </div>
                <UserStatusBadge user={user} />
              </Group>
              <Group gap={8} mt={6}>
                <Text size="xs" c="dimmed">
                  Joined {formatJoinedDate(user.createdAt)}
                </Text>
                <ActivityLine user={user} />
              </Group>
            </div>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
