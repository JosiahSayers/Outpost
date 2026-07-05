import TaskList from "$/frontend/trip/tasks/list";
import MobileTaskList from "$/frontend/trip/tasks/mobile-list";
import TaskEditDrawer from "$/frontend/trip/tasks/task-edit-drawer";
import type { ClientTripTask } from "$/transformers/trip-task";
import { Button, Group, Stack, Stepper, Text, Title } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  CompassIcon,
  FlagIcon,
  MountainsIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useMemo } from "react";
import type { TripTaskPhase } from "../../../../generated/prisma/enums";

type TaskPhase = TripTaskPhase;

interface Props {
  tripId: string;
  tasks: ClientTripTask[];
  tripStart: string | null;
  tripEnd: string | null;
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

// Combines task completion and trip dates into a single phase index, taking
// whichever signal is furthest along so the stepper never regresses just
// because one of the two disagrees (e.g. the trip started but "before"
// tasks are still incomplete).
function getActivePhaseIndex(
  tasks: ClientTripTask[],
  tripStart: string | null,
  tripEnd: string | null,
) {
  const today = new Date().toISOString().slice(0, 10);
  const beforeTasks = tasks.filter((t) => t.phase === "before");
  const duringTasks = tasks.filter((t) => t.phase === "during");
  const beforeComplete =
    beforeTasks.length > 0 && beforeTasks.every((t) => t.complete);
  const duringComplete =
    duringTasks.length > 0 && duringTasks.every((t) => t.complete);

  let index = 0;
  if (beforeComplete) index = Math.max(index, 1);
  if (beforeComplete && duringComplete) index = Math.max(index, 2);
  if (tripStart && today >= tripStart) index = Math.max(index, 1);
  if (tripEnd && today > tripEnd) index = Math.max(index, 2);

  return index;
}

export default function Tasks({ tripId, tasks, tripStart, tripEnd }: Props) {
  // Below `sm`, three horizontal steps don't fit on one line — wrapping breaks
  // the connecting lines between steps, so switch to vertical orientation
  // instead of letting the horizontal layout wrap.
  const isNarrow = useMediaQuery("(max-width: 47.99em)", false, {
    getInitialValueInEffect: false,
  });
  const [addOpened, add] = useDisclosure(false);
  const doneCount = tasks.filter((t) => t.complete).length;
  const activePhaseIndex = useMemo(
    () => getActivePhaseIndex(tasks, tripStart, tripEnd),
    [tasks, tripStart, tripEnd],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" align="baseline">
        <Title order={3}>Trip Tasks</Title>
        <Group gap="sm">
          <Text size="sm" c="dimmed">
            {doneCount}/{tasks.length} complete
          </Text>
          <Button
            size="xs"
            variant="default"
            leftSection={<PlusIcon size={14} />}
            onClick={add.open}
          >
            Add task
          </Button>
        </Group>
      </Group>

      <Stepper
        active={activePhaseIndex}
        size="sm"
        iconSize={30}
        orientation={isNarrow ? "vertical" : "horizontal"}
      >
        {PHASES.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase === phase);
          const done = phaseTasks.filter((t) => t.complete).length;
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

      {isNarrow ? (
        <MobileTaskList tripId={tripId} tasks={tasks} />
      ) : (
        <TaskList tripId={tripId} tasks={tasks} />
      )}

      <TaskEditDrawer tripId={tripId} opened={addOpened} onClose={add.close} />
    </Stack>
  );
}
