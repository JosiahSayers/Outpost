import type { ClientTrip } from "$/transformers/trip";
import { Badge, Button, Card, Group, Text, Title } from "@mantine/core";
import { CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react";
import { Link } from "wouter";
import type { TripStatus } from "../../../generated/prisma/enums";

export const STATUS_COLOR: Record<TripStatus, string> = {
  planning: "trail-dust",
  in_progress: "trail-green",
  postponed: "stone-gray",
  finished: "stone-gray",
  cancelled: "stone-gray",
};

export const STATUS_LABEL: Record<TripStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  postponed: "Postponed",
  finished: "Completed",
  cancelled: "Cancelled",
};

export function formatDateRange(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return "Dates TBD";

  // Trip dates are calendar days, not instants, so they're always formatted
  // in UTC (the timezone they were stored in) rather than the viewer's local
  // timezone, which could otherwise roll a UTC-midnight timestamp back to
  // the previous day.
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (!start || !end) {
    const only = new Date((start ?? end)!);
    return fmt.format(only);
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}, ${endDate.getUTCFullYear()}`;
}

export default function TripCard({ trip }: { trip: ClientTrip }) {
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
          <MapPinIcon size={14} />
          <Text size="sm">{trip.location}</Text>
        </Group>
      )}

      <Group gap="xs" c="dimmed" mb="md">
        <CalendarBlankIcon size={14} />
        <Text size="sm">{formatDateRange(trip.start, trip.end)}</Text>
      </Group>

      <div style={{ flex: 1 }} />

      <Button
        component={Link}
        href={`/trips/${trip.id}`}
        variant="light"
        fullWidth
        mt="md"
        size="sm"
      >
        View Trip
      </Button>
    </Card>
  );
}
