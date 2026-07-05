import {
  formatDateRange,
  STATUS_COLOR,
  STATUS_LABEL,
} from "$/frontend/dashboard/trip-card";
import {
  packingCompletion,
  placeholderLinks,
  placeholderMealPlan,
  placeholderPackingLists,
  placeholderTasks,
  taskCompletion,
  type TaskPhase,
} from "$/frontend/trip/placeholder-data";
import { useTrip } from "$/frontend/utils/api/trip";
import { useAuthenticatedGuard } from "$/frontend/utils/guards/authenticated.guard";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Stepper,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  CompassIcon,
  FlagIcon,
  ForkKnifeIcon,
  LinkIcon,
  MapPinIcon,
  MountainsIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useParams } from "wouter";

const PHASE_LABEL: Record<TaskPhase, string> = {
  before: "Before the Trip",
  during: "During the Trip",
  after: "After the Trip",
};

const PHASE_ICON: Record<TaskPhase, ReactNode> = {
  before: <CompassIcon size={16} />,
  during: <MountainsIcon size={16} />,
  after: <FlagIcon size={16} />,
};

const PHASES: TaskPhase[] = ["before", "during", "after"];

// Trip hasn't started yet, so "Before the Trip" is the current phase. Once
// there's a real trip-status-to-phase mapping this would be derived instead
// of hardcoded.
const ACTIVE_PHASE_INDEX = 0;

export default function TripPage() {
  useAuthenticatedGuard();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useTrip(id);

  // Below `sm`, three horizontal steps don't fit on one line — wrapping breaks
  // the connecting lines between steps, so switch to vertical orientation
  // instead of letting the horizontal layout wrap.
  const isNarrow = useMediaQuery("(max-width: 47.99em)", false, {
    getInitialValueInEffect: false,
  });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Stack py="xl" px={{ base: "md", md: "xl" }} maw={1000} mx="auto">
        <Alert color="red" title="Couldn't load this trip">
          The trip may not exist or you may not have access to it.
        </Alert>
      </Stack>
    );
  }

  const trip = data.trip;
  const tasks = taskCompletion(placeholderTasks);
  const packing = packingCompletion(placeholderPackingLists);

  return (
    <Stack gap="xl" maw={1000} mx="auto" px={{ base: "md", md: "xl" }} py="xl">
      {/* --- Header --------------------------------------------------- */}
      <Paper withBorder p="lg" bg="trail-green.0">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={6}>
            <Group gap="sm">
              <Title order={1}>{trip.name}</Title>
              <Badge color={STATUS_COLOR[trip.status]}>
                {STATUS_LABEL[trip.status]}
              </Badge>
            </Group>
            <Group gap="lg">
              {trip.trail && (
                <Group gap={6} c="dimmed">
                  <CompassIcon size={15} />
                  <Text size="sm">{trip.trail}</Text>
                </Group>
              )}
              {trip.location && (
                <Group gap={6} c="dimmed">
                  <MapPinIcon size={15} />
                  <Text size="sm">{trip.location}</Text>
                </Group>
              )}
              <Group gap={6} c="dimmed">
                <CalendarBlankIcon size={15} />
                <Text size="sm">{formatDateRange(trip.start, trip.end)}</Text>
              </Group>
            </Group>
          </Stack>
          <Button variant="light" leftSection={<PencilSimpleIcon size={14} />}>
            Edit
          </Button>
        </Group>
      </Paper>

      {/* --- Trip Tasks: horizontal phase overview + per-phase checklist */}
      <Stack gap="md">
        <Group justify="space-between" align="baseline">
          <Title order={3}>Trip Tasks</Title>
          <Text size="sm" c="dimmed">
            {tasks.done}/{tasks.total} complete
          </Text>
        </Group>

        <Stepper
          active={ACTIVE_PHASE_INDEX}
          size="sm"
          iconSize={30}
          orientation={isNarrow ? "vertical" : "horizontal"}
        >
          {PHASES.map((phase) => {
            const phaseTasks = placeholderTasks.filter(
              (t) => t.phase === phase,
            );
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

        {isNarrow ? (
          <Stack gap="lg">
            {PHASES.map((phase) => {
              const phaseTasks = placeholderTasks.filter(
                (t) => t.phase === phase,
              );
              return (
                <Stack gap="xs" key={phase}>
                  <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                    {PHASE_LABEL[phase]}
                  </Text>
                  {phaseTasks.map((task) => (
                    <Checkbox
                      key={task.id}
                      checked={task.done}
                      readOnly
                      label={task.label}
                      description={
                        task.dueDate ? `Due ${task.dueDate}` : undefined
                      }
                    />
                  ))}
                </Stack>
              );
            })}
          </Stack>
        ) : (
          // Equal-thirds columns, each aligned differently (left / center /
          // right) so the eye reads three distinct groups rather than
          // expecting them to line up with the stepper icons above.
          <SimpleGrid cols={3} spacing="lg">
            {PHASES.map((phase, index) => {
              const phaseTasks = placeholderTasks.filter(
                (t) => t.phase === phase,
              );
              const indexJustifications = ["flex-start", "center", "flex-end"];
              return (
                <Stack
                  gap="xs"
                  key={phase}
                  style={{ justifySelf: indexJustifications[index] }}
                >
                  {phaseTasks.map((task) => (
                    <Checkbox
                      key={task.id}
                      checked={task.done}
                      readOnly
                      label={task.label}
                      description={
                        task.dueDate ? `Due ${task.dueDate}` : undefined
                      }
                    />
                  ))}
                </Stack>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>

      <Divider />

      {/* --- Packing Lists --------------------------------------------- */}
      <Stack gap="sm">
        <Title order={3}>Packing Lists</Title>
        <Stack gap="sm">
          {placeholderPackingLists.map((list) => {
            const complete = list.packedItems === list.totalItems;
            return (
              <Card key={list.id} withBorder>
                <Group justify="space-between" mb="xs">
                  <Text fw={600}>{list.name}</Text>
                  {complete && <Badge color="trail-green">Packed</Badge>}
                </Group>
                <Progress
                  value={(list.packedItems / list.totalItems) * 100}
                  color="trail-green"
                  size="md"
                  mb={6}
                />
                <Text size="xs" c="dimmed">
                  {list.packedItems}/{list.totalItems} packed
                </Text>
              </Card>
            );
          })}
          <Button variant="subtle" size="sm" style={{ alignSelf: "flex-start" }}>
            Assign a packing list
          </Button>
        </Stack>
      </Stack>

      <Divider />

      {/* --- Meal Plan: table on tablet+, stacked cards on phone ------- */}
      <Stack gap="sm">
        <Title order={3}>Meal Plan</Title>

        <Box visibleFrom="sm">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Day</Table.Th>
                <Table.Th>Breakfast</Table.Th>
                <Table.Th>Lunch</Table.Th>
                <Table.Th>Dinner</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {placeholderMealPlan.map((meal) => (
                <Table.Tr key={meal.day}>
                  <Table.Td>
                    <Text fw={600} size="sm">
                      {meal.day}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {meal.date}
                    </Text>
                  </Table.Td>
                  <Table.Td>{meal.breakfast ?? "—"}</Table.Td>
                  <Table.Td>{meal.lunch ?? "—"}</Table.Td>
                  <Table.Td>{meal.dinner ?? "—"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        <Stack gap="xs" hiddenFrom="sm">
          {placeholderMealPlan.map((meal) => (
            <Paper withBorder p="sm" key={meal.day}>
              <Group justify="space-between" mb={6}>
                <Text fw={600} size="sm">
                  {meal.day}
                </Text>
                <Text size="xs" c="dimmed">
                  {meal.date}
                </Text>
              </Group>
              <Stack gap={2}>
                {meal.breakfast && (
                  <Group gap={6}>
                    <ForkKnifeIcon size={13} />
                    <Text size="sm" c="dimmed">
                      Breakfast — {meal.breakfast}
                    </Text>
                  </Group>
                )}
                {meal.lunch && (
                  <Group gap={6}>
                    <ForkKnifeIcon size={13} />
                    <Text size="sm" c="dimmed">
                      Lunch — {meal.lunch}
                    </Text>
                  </Group>
                )}
                {meal.dinner && (
                  <Group gap={6}>
                    <ForkKnifeIcon size={13} />
                    <Text size="sm" c="dimmed">
                      Dinner — {meal.dinner}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Stack>

      <Divider />

      {/* --- Links --------------------------------------------------- */}
      <Stack gap="sm">
        <Title order={3}>Links</Title>
        <Stack gap="xs">
          {placeholderLinks.map((link) => (
            <Paper withBorder p="sm" key={link.id}>
              <Group justify="space-between">
                <Group gap="sm">
                  <LinkIcon size={16} />
                  <div>
                    <Text size="sm" fw={600}>
                      {link.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {link.source}
                    </Text>
                  </div>
                </Group>
                <ArrowSquareOutIcon size={16} />
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
