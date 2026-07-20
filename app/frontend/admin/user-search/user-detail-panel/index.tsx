import ToolCard from "$/frontend/admin/overview/tool-card";
import { formatJoinedDate } from "$/frontend/admin/user-search/format-date";
import { adminActions } from "$/frontend/admin/user-search/user-detail-panel/admin-actions";
import StatTile from "$/frontend/admin/user-search/user-detail-panel/stat-tile";
import UserStatusBadge from "$/frontend/admin/user-search/user-status-badge";
import Error from "$/frontend/shared-components/error";
import { getInitials } from "$/frontend/utils/get-initials";
import type { ClientAdminUser } from "$/transformers/admin/user";
import {
  Avatar,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";

interface UserDetailPanelProps {
  user: ClientAdminUser;
}

export default function UserDetailPanel({ user }: UserDetailPanelProps) {
  return (
    <Paper withBorder p="lg">
      <Group gap="md" align="flex-start" wrap="wrap">
        <Avatar radius="xl" size={56} color="stone-gray" variant="filled">
          {getInitials(user.name)}
        </Avatar>
        <Stack gap={4} style={{ flex: 1, minWidth: 180 }}>
          <Title order={3}>{user.name}</Title>
          <Group gap={6} c="dimmed">
            <EnvelopeSimpleIcon size={14} />
            <Text size="sm">{user.email}</Text>
          </Group>
          <Group gap={6} mt={2}>
            <UserStatusBadge user={user} />
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            Joined {formatJoinedDate(user.createdAt)}
          </Text>
        </Stack>
      </Group>

      {user.banned && (
        <Error
          mt="md"
          message={
            user.banReason
              ? `Banned: ${user.banReason}`
              : "This account is banned."
          }
        />
      )}

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="lg">
        <StatTile label="Trips" value={user.counts.trips} />
        <StatTile label="Gear Items" value={user.counts.gearInventoryItems} />
        <StatTile label="Packing Lists" value={user.counts.packingLists} />
        <StatTile label="Active Sessions" value={user.counts.activeSessions} />
      </SimpleGrid>

      <Text
        size="10px"
        fw={700}
        tt="uppercase"
        c="dimmed"
        mt="xl"
        mb="sm"
        style={{ letterSpacing: "0.06em" }}
      >
        Admin actions
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {adminActions(user.id).map((tool) => (
          <ToolCard key={tool.href} tool={tool} isPrimary={false} />
        ))}
      </SimpleGrid>
    </Paper>
  );
}
