import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import TripActionsMenu from "$/frontend/trip/header/trip-actions-menu";
import TripDates from "$/frontend/trip/header/trip-dates";
import TripName from "$/frontend/trip/header/trip-name";
import TripStatusBadge from "$/frontend/trip/header/trip-status";
import TripTextField from "$/frontend/trip/header/trip-text-field";
import { useDeleteTrip, useUpdateTrip } from "$/frontend/utils/api/trip";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTrip } from "$/transformers/trip";
import { Box, Group, Paper, Stack } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { CompassIcon, MapPinIcon } from "@phosphor-icons/react";
import { useLocation } from "wouter";

interface Props {
  trip: ClientTrip;
}

export default function Header({ trip }: Props) {
  const [, navigate] = useLocation();
  const [confirmOpened, confirm] = useDisclosure(false);
  const updateTrip = useUpdateTrip(trip.id);
  const deleteTrip = useDeleteTrip(trip.id);
  const isWideLayout = useMediaQuery("(min-width: 48em)");

  function handleStatusSave(status: ClientTrip["status"]) {
    updateTrip.mutate(
      { status },
      { onError: notifyError("Couldn't update status") },
    );
  }

  function handleDelete() {
    deleteTrip.mutate(undefined, {
      onSuccess: () => navigate("/dashboard"),
      onError: notifyError("Couldn't delete trip"),
    });
  }

  return (
    <Paper withBorder p="lg" bg="trail-green.0">
      <Stack gap={6}>
        <Group
          gap="sm"
          justify="space-between"
          wrap="nowrap"
          align="flex-start"
        >
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <Box style={{ minWidth: 0, flex: 1 }}>
              <TripName
                value={trip.name}
                onSave={(name) =>
                  updateTrip.mutate(
                    { name },
                    { onError: notifyError("Couldn't rename trip") },
                  )
                }
              />
            </Box>
            {isWideLayout && (
              <Box style={{ flexShrink: 0, alignSelf: "flex-start" }}>
                <TripStatusBadge
                  value={trip.status}
                  onSave={handleStatusSave}
                />
              </Box>
            )}
          </Group>

          <Box style={{ flexShrink: 0 }}>
            <TripActionsMenu onDelete={confirm.open} />
          </Box>
        </Group>
        {isWideLayout === false && (
          <Box>
            <TripStatusBadge value={trip.status} onSave={handleStatusSave} />
          </Box>
        )}
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
            onSave={(range) =>
              updateTrip.mutate(range, {
                onError: notifyError("Couldn't update dates"),
              })
            }
          />
        </Group>
      </Stack>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={handleDelete}
        title="Delete trip?"
      >
        Remove <strong>{trip.name}</strong>? This can&apos;t be undone.
      </ConfirmDeleteModal>
    </Paper>
  );
}
