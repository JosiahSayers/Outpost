import {
  placeholderTasks,
  taskCompletion,
  type PlaceholderTask,
  type TaskPhase,
} from "$/frontend/trip/placeholder-data";
import TaskList from "$/frontend/trip/tasks/list";
import MobileTaskList from "$/frontend/trip/tasks/mobile-list";
import { Group, Stack, Stepper, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { CompassIcon, FlagIcon, MountainsIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

interface Props {
  tripId: string;
  tasks: PlaceholderTask[];
}

export const PHASE_LABEL: Record<TaskPhase, string> = {
  before: "Before the Trip",
  during: "During the Trip",
  after: "After the Trip",
};

export const PHASE_ICON: Record<TaskPhase, ReactNode> = {
  before: <CompassIcon size={16} />,
  during: <MountainsIcon size={16} />,
  after: <FlagIcon size={16} />,
};

export const PHASES: TaskPhase[] = ["before", "during", "after"];

// Trip hasn't started yet, so "Before the Trip" is the current phase. Once
// there's a real trip-status-to-phase mapping this would be derived instead
// of hardcoded.
const ACTIVE_PHASE_INDEX = 0;

export default function Tasks({ tasks }: Props) {
  // Below `sm`, three horizontal steps don't fit on one line — wrapping breaks
  // the connecting lines between steps, so switch to vertical orientation
  // instead of letting the horizontal layout wrap.
  const isNarrow = useMediaQuery("(max-width: 47.99em)", false, {
    getInitialValueInEffect: false,
  });
  const tasksWithCompletion = taskCompletion(tasks);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="baseline">
        <Title order={3}>Trip Tasks</Title>
        <Text size="sm" c="dimmed">
          {tasksWithCompletion.done}/{tasksWithCompletion.total} complete
        </Text>
      </Group>

      <Stepper
        active={ACTIVE_PHASE_INDEX}
        size="sm"
        iconSize={30}
        orientation={isNarrow ? "vertical" : "horizontal"}
      >
        {PHASES.map((phase) => {
          const phaseTasks = placeholderTasks.filter((t) => t.phase === phase);
          const done = phaseTasks.filter((t) => t.done).length;
          return (
            <Stepper.Step
              key={phase}
              icon={PHASE_ICON[phase]}
              label={PHASE_LABEL[phase]}
              description={`${done}/${phaseTasks.length} done`}
            />
          );
        })}
      </Stepper>

      {isNarrow ? <MobileTaskList /> : <TaskList />}
    </Stack>
  );
}
