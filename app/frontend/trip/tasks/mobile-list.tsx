import { PHASE_LABEL, PHASES } from "$/frontend/trip/tasks";
import TaskListItem from "$/frontend/trip/tasks/task-list-item";
import type { ClientTripTask } from "$/transformers/trip-task";
import { Stack, Text } from "@mantine/core";

interface Props {
  tripId: string;
  tasks: ClientTripTask[];
}

export default function MobileTaskList({ tripId, tasks }: Props) {
  return (
    <Stack gap="lg">
      {PHASES.map((phase) => {
        const phaseTasks = tasks.filter((t) => t.phase === phase);
        return (
          <Stack gap="xs" key={phase}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {PHASE_LABEL[phase]}
            </Text>

            {phaseTasks.map((task) => (
              <TaskListItem task={task} tripId={tripId} key={task.id} />
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
