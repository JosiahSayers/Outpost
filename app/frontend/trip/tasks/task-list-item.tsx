import type { PlaceholderTask } from "$/frontend/trip/placeholder-data";
import { Checkbox } from "@mantine/core";

interface Props {
  task: PlaceholderTask;
}

export default function TaskListItem({ task }: Props) {
  return (
    <Checkbox
      key={task.id}
      checked={task.done}
      readOnly
      label={task.label}
      description={task.dueDate ? `Due ${task.dueDate}` : undefined}
    />
  );
}
