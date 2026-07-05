import type { Trip } from "$/frontend/dashboard/types";
import TripDates from "$/frontend/trip/header/trip-dates";
import TripName from "$/frontend/trip/header/trip-name";
import TripStatusBadge from "$/frontend/trip/header/trip-status";
import TripTextField from "$/frontend/trip/header/trip-text-field";
import { useUpdateTrip } from "$/frontend/utils/api/trip";
import { Group, Paper, Stack } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { CompassIcon, MapPinIcon } from "@phosphor-icons/react";

interface Props {
  trip: Trip;
}

export default function Header({ trip }: Props) {
  const updateTrip = useUpdateTrip(trip.id);

  const notifyError = (title: string) => (error: Error) =>
    notifications.show({ color: "red", title, message: error.message });

  return (
    <Paper withBorder p="lg" bg="trail-green.0">
      <Stack gap={6}>
        <Group gap="sm">
          <TripName
            value={trip.name}
            onSave={(name) =>
              updateTrip.mutate(
                { name },
                { onError: notifyError("Couldn't rename trip") },
              )
            }
          />
          <TripStatusBadge
            value={trip.status}
            onSave={(status) =>
              updateTrip.mutate(
                { status },
                { onError: notifyError("Couldn't update status") },
              )
            }
          />
        </Group>
        <Group gap="lg">
          <TripTextField
            icon={<CompassIcon size={15} />}
            value={trip.trail}
            placeholder="Add a trail"
            onSave={(trail) =>
              updateTrip.mutate(
                { trail },
                { onError: notifyError("Couldn't update trail") },
              )
            }
          />
          <TripTextField
            icon={<MapPinIcon size={15} />}
            value={trip.location}
            placeholder="Add a location"
            onSave={(location) =>
              updateTrip.mutate(
                { location },
                { onError: notifyError("Couldn't update location") },
              )
            }
          />
          <TripDates
            start={trip.start}
            end={trip.end}
            onSave={({ start, end }) =>
              // The edit-trip schema coerces `null` into the epoch date rather
              // than clearing it, so only ever send a real date or omit the key.
              updateTrip.mutate(
                { start: start ?? undefined, end: end ?? undefined },
                { onError: notifyError("Couldn't update dates") },
              )
            }
          />
        </Group>
      </Stack>
    </Paper>
  );
}
