import { placeholderTasks } from "$/frontend/trip/placeholder-data";
import { PHASE_LABEL, PHASES } from "$/frontend/trip/tasks";
import TaskListItem from "$/frontend/trip/tasks/task-list-item";
import { Stack, Text } from "@mantine/core";

export default function MobileTaskList() {
  return (
    <Stack gap="lg">
      {PHASES.map((phase) => {
        const phaseTasks = placeholderTasks.filter((t) => t.phase === phase);
        return (
          <Stack gap="xs" key={phase}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              {PHASE_LABEL[phase]}
            </Text>

            {phaseTasks.map((task) => (
              <TaskListItem task={task} />
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
