import type { ListStatus, Trip, TripStatus } from "$/frontend/dashboard/types";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  CalendarBlank,
  CheckCircle,
  Circle,
  CircleHalf,
  MapPin,
} from "@phosphor-icons/react";

const STATUS_COLOR: Record<TripStatus, string> = {
  planning: "trail-dust",
  upcoming: "trail-green",
  completed: "stone-gray",
};

const STATUS_LABEL: Record<TripStatus, string> = {
  planning: "Planning",
  upcoming: "Upcoming",
  completed: "Completed",
};

function ListStatusIcon({ status }: { status: ListStatus }) {
  if (status === "complete")
    return (
      <CheckCircle
        size={16}
        color="var(--mantine-color-trail-green-6)"
        weight="fill"
      />
    );
  if (status === "in-progress")
    return <CircleHalf size={16} color="var(--mantine-color-trail-dust-5)" />;
  return <Circle size={16} color="var(--mantine-color-stone-gray-4)" />;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getFullYear()}`;
}

export default function TripCard({ trip }: { trip: Trip }) {
  return (
    <Card h="100%" style={{ display: "flex", flexDirection: "column" }}>
      <Group justify="space-between" mb="xs">
        <Badge color={STATUS_COLOR[trip.status]}>
          {STATUS_LABEL[trip.status]}
        </Badge>
      </Group>

      <Title order={4} mb="xs" lineClamp={2}>
        {trip.name}
      </Title>

      <Group gap="xs" c="dimmed" mb={4}>
        <MapPin size={14} />
        <Text size="sm">{trip.location}</Text>
      </Group>

      <Group gap="xs" c="dimmed" mb="md">
        <CalendarBlank size={14} />
        <Text size="sm">{formatDateRange(trip.startDate, trip.endDate)}</Text>
      </Group>

      <Divider mb="md" />

      <Stack gap="xs" style={{ flex: 1 }}>
        {trip.packingLists.map((list) => (
          <Group key={list.id} gap="xs" wrap="nowrap">
            <ListStatusIcon status={list.status} />
            <Text size="sm" style={{ flex: 1 }} lineClamp={1}>
              {list.name}
            </Text>
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {list.itemCount} items
            </Text>
          </Group>
        ))}
      </Stack>

      <Button variant="light" fullWidth mt="md" size="sm">
        View Trip
      </Button>
    </Card>
  );
}
