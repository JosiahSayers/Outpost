import type { Trip, TripStatus } from "$/frontend/dashboard/types";
import { Badge, Button, Card, Group, Text, Title } from "@mantine/core";
import { CalendarBlank, MapPin } from "@phosphor-icons/react";

const STATUS_COLOR: Record<TripStatus, string> = {
  planned: "trail-dust",
  in_progress: "trail-green",
  postponed: "stone-gray",
  finished: "stone-gray",
  cancelled: "stone-gray",
};

const STATUS_LABEL: Record<TripStatus, string> = {
  planned: "Planning",
  in_progress: "In Progress",
  postponed: "Postponed",
  finished: "Completed",
  cancelled: "Cancelled",
};

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates TBD";

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  if (!start || !end) {
    const only = new Date((start ?? end)!);
    return fmt.format(only);
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}, ${endDate.getFullYear()}`;
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

      {trip.location && (
        <Group gap="xs" c="dimmed" mb={4}>
          <MapPin size={14} />
          <Text size="sm">{trip.location}</Text>
        </Group>
      )}

      <Group gap="xs" c="dimmed" mb="md">
        <CalendarBlank size={14} />
        <Text size="sm">{formatDateRange(trip.start, trip.end)}</Text>
      </Group>

      <div style={{ flex: 1 }} />

      <Button variant="light" fullWidth mt="md" size="sm">
        View Trip
      </Button>
    </Card>
  );
}
