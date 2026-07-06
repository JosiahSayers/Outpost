import { STATUS_LABEL } from "$/frontend/dashboard/trip-card";
import DateInput from "$/frontend/shared-components/date-input";
import Error from "$/frontend/shared-components/error";
import { useCreateTrip } from "$/frontend/utils/api/trip";
import { newTrip } from "$/validation/trip";
import {
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import type { TripStatus } from "../../../generated/prisma/enums";

const STATUS_VALUES = Object.keys(STATUS_LABEL) as [
  TripStatus,
  ...TripStatus[],
];
const STATUS_OPTIONS = STATUS_VALUES.map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function NewTripDrawer({ opened, onClose }: Props) {
  const createTrip = useCreateTrip();

  const form = useForm({
    initialValues: {
      name: "",
      status: "planning" as TripStatus,
      trail: "",
      location: "",
      start: null as string | null,
      end: null as string | null,
    },
    validate: schemaResolver(newTrip, { sync: true }),
  });

  const handleClose = () => {
    form.reset();
    createTrip.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit((values) => {
    createTrip.mutate(
      {
        name: values.name,
        status: values.status,
        trail: values.trail || undefined,
        location: values.location || undefined,
        start: values.start ?? undefined,
        end: values.end ?? undefined,
      },
      { onSuccess: handleClose },
    );
  });

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
          New trip
        </Text>
      }
      position="right"
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md" pt="xs">
          <TextInput
            label="Trip name"
            placeholder="e.g. Wonderland Trail Loop"
            required
            {...form.getInputProps("name")}
          />
          <Select
            label="Status"
            data={STATUS_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps("status")}
          />
          <TextInput
            label="Trail"
            placeholder="e.g. Wonderland Trail"
            description="Optional"
            {...form.getInputProps("trail")}
          />
          <TextInput
            label="Location"
            placeholder="e.g. Mount Rainier National Park, WA"
            description="Optional"
            {...form.getInputProps("location")}
          />
          <Group grow>
            <DateInput label="Start date" {...form.getInputProps("start")} />
            <DateInput label="End date" {...form.getInputProps("end")} />
          </Group>
          {createTrip.isError && <Error />}
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createTrip.isPending}>
              Create trip
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
