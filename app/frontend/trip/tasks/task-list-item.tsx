import TaskEditDrawer from "$/frontend/trip/tasks/task-edit-drawer";
import { useUpdateTripTask } from "$/frontend/utils/api/trip-tasks";
import type { ClientTripTask } from "$/transformers/trip-task";
import { Checkbox, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

interface Props {
  task: ClientTripTask;
  tripId: string;
}

// Due dates are calendar days, not instants, so format in UTC (the timezone
// they were stored in) rather than the viewer's local timezone.
function formatDueDate(iso: string): string {
  return new Intl.DateTimeFormat(navigator.language, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function TaskListItem({ task, tripId }: Props) {
  const [detailOpened, detail] = useDisclosure(false);
  const updateTask = useUpdateTripTask(tripId);

  return (
    <>
      <Group
        gap="xs"
        wrap="nowrap"
        align="flex-start"
        onClick={detail.open}
        style={{ cursor: "pointer", borderRadius: "var(--mantine-radius-sm)" }}
        px={4}
        py={2}
      >
        <Checkbox
          aria-label={task.name}
          checked={task.complete}
          onChange={(e) =>
            updateTask.mutate({
              taskId: task.id,
              complete: e.currentTarget.checked,
            })
          }
          onClick={(e) => e.stopPropagation()}
          mt={2}
        />
        <Stack gap={0} style={{ flex: 1 }}>
          <Text
            size="sm"
            td={task.complete ? "line-through" : undefined}
            c={task.complete ? "dimmed" : undefined}
          >
            {task.name}
          </Text>
          {task.dueDate && (
            <Text size="xs" c="dimmed">
              Due {formatDueDate(task.dueDate)}
            </Text>
          )}
        </Stack>
      </Group>

      <TaskEditDrawer
        task={task}
        tripId={tripId}
        opened={detailOpened}
        onClose={detail.close}
      />
    </>
  );
}
