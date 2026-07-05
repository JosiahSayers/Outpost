import { PHASES } from "$/frontend/trip/tasks";
import TaskListItem from "$/frontend/trip/tasks/task-list-item";
import type { ClientTripTask } from "$/transformers/trip-task";
import { SimpleGrid, Stack } from "@mantine/core";

interface Props {
  tripId: string;
  tasks: ClientTripTask[];
}

export default function TaskList({ tripId, tasks }: Props) {
  return (
    <SimpleGrid cols={3} spacing="lg">
      {PHASES.map((phase, index) => {
        const phaseTasks = tasks.filter((t) => t.phase === phase);
        const indexJustifications = ["flex-start", "center", "flex-end"];

        return (
          <Stack
            gap="xs"
            key={phase}
            style={{ justifySelf: indexJustifications[index] }}
          >
            {phaseTasks.map((task) => (
              <TaskListItem task={task} tripId={tripId} key={task.id} />
            ))}
          </Stack>
        );
      })}
    </SimpleGrid>
  );
}
