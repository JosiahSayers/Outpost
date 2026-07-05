import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { PHASE_LABEL, PHASES } from "$/frontend/trip/tasks";
import {
  useCreateTripTask,
  useDeleteTripTask,
  useUpdateTripTask,
} from "$/frontend/utils/api/trip-tasks";
import { highlightSelectedDate } from "$/frontend/utils/highlight-selected-date";
import type { ClientTripTask } from "$/transformers/trip-task";
import { editTask } from "$/validation/trip/task";
import {
  Button,
  Divider,
  Drawer,
  Group,
  Select,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { TrashIcon } from "@phosphor-icons/react";
import { useEffect } from "react";

interface Props {
  task?: ClientTripTask;
  tripId: string;
  opened: boolean;
  onClose: () => void;
}

const emptyValues = {
  name: "",
  phase: "before" as ClientTripTask["phase"],
  dueDate: null as string | null,
};

export default function TaskEditDrawer({
  task,
  tripId,
  opened,
  onClose,
}: Props) {
  const [confirmOpened, confirm] = useDisclosure(false);
  const createTask = useCreateTripTask(tripId);
  const updateTask = useUpdateTripTask(tripId);
  const deleteTask = useDeleteTripTask(tripId);

  const form = useForm({
    initialValues: task
      ? { name: task.name, phase: task.phase, dueDate: task.dueDate }
      : emptyValues,
    validate: schemaResolver(editTask, { sync: true }),
  });

  // The drawer stays mounted (so its close transition can play), so the
  // draft has to be re-synced from the task explicitly each time it opens
  // rather than relying on `initialValues`, which only apply once on mount.
  useEffect(() => {
    if (opened) {
      form.setValues(
        task
          ? { name: task.name, phase: task.phase, dueDate: task.dueDate }
          : emptyValues,
      );
      form.resetDirty();
    }
  }, [opened]);

  const handleSubmit = form.onSubmit((values) => {
    if (task) {
      updateTask.mutate({ taskId: task.id, ...values });
    } else {
      createTask.mutate(values);
    }
    onClose();
  });

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="right"
        title={task ? "Edit task" : "New task"}
        size="xs"
      >
        <form onSubmit={handleSubmit} noValidate>
          <TextInput
            label="Name"
            required
            {...form.getInputProps("name")}
            mb="sm"
          />

          <Select
            label="Phase"
            data={PHASES.map((phase) => ({
              value: phase,
              label: PHASE_LABEL[phase],
            }))}
            allowDeselect={false}
            {...form.getInputProps("phase")}
            mb="sm"
          />

          <DateInput
            label="Due date"
            clearable
            firstDayOfWeek={0}
            getDayProps={highlightSelectedDate(form.values.dueDate)}
            {...form.getInputProps("dueDate")}
            mb="lg"
          />

          <Divider mb="md" />

          <Group justify={task ? "space-between" : "flex-end"}>
            {task && (
              <Button
                color="red"
                variant="subtle"
                leftSection={<TrashIcon size={14} />}
                onClick={confirm.open}
              >
                Delete task
              </Button>
            )}
            <Button type="submit">Save</Button>
          </Group>
        </form>
      </Drawer>

      {task && (
        <ConfirmDeleteModal
          opened={confirmOpened}
          onClose={confirm.close}
          onConfirm={() => {
            deleteTask.mutate(task.id);
            onClose();
          }}
          title="Delete task?"
        >
          Remove <strong>{task.name}</strong> from this trip? This can&apos;t be
          undone.
        </ConfirmDeleteModal>
      )}
    </>
  );
}
