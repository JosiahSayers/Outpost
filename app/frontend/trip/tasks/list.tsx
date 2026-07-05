import { placeholderTasks } from "$/frontend/trip/placeholder-data";
import { PHASES } from "$/frontend/trip/tasks";
import TaskListItem from "$/frontend/trip/tasks/task-list-item";
import { SimpleGrid, Stack } from "@mantine/core";

export default function TaskList() {
  return (
    <SimpleGrid cols={3} spacing="lg">
      {PHASES.map((phase, index) => {
        const phaseTasks = placeholderTasks.filter((t) => t.phase === phase);
        const indexJustifications = ["flex-start", "center", "flex-end"];

        return (
          <Stack
            gap="xs"
            key={phase}
            style={{ justifySelf: indexJustifications[index] }}
          >
            {phaseTasks.map((task) => (
              <TaskListItem task={task} />
            ))}
          </Stack>
        );
      })}
    </SimpleGrid>
  );
}
