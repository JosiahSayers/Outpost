import { Button, Paper, Stack, Text } from "@mantine/core";
import { ListBulletsIcon } from "@phosphor-icons/react";

interface Props {
  onAssign: () => void;
}

export default function PackingListEmptyState({ onAssign }: Props) {
  return (
    <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
      <Stack align="center" gap={4} ta="center">
        <ListBulletsIcon size={28} color="var(--mantine-color-trail-green-6)" />
        <Text fw={700} mt="xs">
          No packing list assigned
        </Text>
        <Text size="sm" c="dimmed" maw={360}>
          Assign one to start tracking what&rsquo;s packed for this trip.
        </Text>
        <Button mt="sm" onClick={onAssign}>
          Assign a packing list
        </Button>
      </Stack>
    </Paper>
  );
}
