import {
  STATUS_COLOR,
  STATUS_LABEL,
  formatDateRange,
} from "$/frontend/dashboard/trip-card";
import type { ClientTrip } from "$/transformers/trip";
import { Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import {
  CalendarBlankIcon,
  CompassIcon,
  MapPinIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";

interface Props {
  trip: ClientTrip;
}

export default function Header({ trip }: Props) {
  return (
    <Paper withBorder p="lg" bg="trail-green.0">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={6}>
          <Group gap="sm">
            <Title order={1}>{trip.name}</Title>
            <Badge color={STATUS_COLOR[trip.status]}>
              {STATUS_LABEL[trip.status]}
            </Badge>
          </Group>
          <Group gap="lg">
            {trip.trail && (
              <Group gap={6} c="dimmed">
                <CompassIcon size={15} />
                <Text size="sm">{trip.trail}</Text>
              </Group>
            )}
            {trip.location && (
              <Group gap={6} c="dimmed">
                <MapPinIcon size={15} />
                <Text size="sm">{trip.location}</Text>
              </Group>
            )}
            <Group gap={6} c="dimmed">
              <CalendarBlankIcon size={15} />
              <Text size="sm">
                {formatDateRange(trip.start as any, trip.end as any)}
              </Text>
            </Group>
          </Group>
        </Stack>
        <Button variant="light" leftSection={<PencilSimpleIcon size={14} />}>
          Edit
        </Button>
      </Group>
    </Paper>
  );
}
