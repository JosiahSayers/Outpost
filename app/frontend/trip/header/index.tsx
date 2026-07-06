import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import TripDates from "$/frontend/trip/header/trip-dates";
import TripName from "$/frontend/trip/header/trip-name";
import TripStatusBadge from "$/frontend/trip/header/trip-status";
import TripTextField from "$/frontend/trip/header/trip-text-field";
import { useDeleteTrip, useUpdateTrip } from "$/frontend/utils/api/trip";
import type { ClientTrip } from "$/transformers/trip";
import { ActionIcon, Group, Menu, Paper, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  CompassIcon,
  DotsThreeVerticalIcon,
  MapPinIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useLocation } from "wouter";

interface Props {
  trip: ClientTrip;
}

export default function Header({ trip }: Props) {
  const [, navigate] = useLocation();
  const [confirmOpened, confirm] = useDisclosure(false);
  const updateTrip = useUpdateTrip(trip.id);
  const deleteTrip = useDeleteTrip(trip.id);

  const notifyError = (title: string) => (error: Error) =>
    notifications.show({ color: "red", title, message: error.message });

  function handleDelete() {
    deleteTrip.mutate(undefined, {
      onSuccess: () => navigate("/dashboard"),
      onError: notifyError("Couldn't delete trip"),
    });
  }

  return (
    <Paper withBorder p="lg" bg="trail-green.0">
      <Stack gap={6}>
        <Group gap="sm" justify="space-between">
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

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Trip actions"
              >
                <DotsThreeVerticalIcon size={18} weight="bold" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                leftSection={<TrashIcon size={14} />}
                onClick={confirm.open}
              >
                Delete trip
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
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
        Remove <strong>{trip.name}</strong> and all of its tasks and packing
        lists? This can&apos;t be undone.
      </ConfirmDeleteModal>
    </Paper>
  );
}
