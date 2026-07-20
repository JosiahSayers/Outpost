import { Paper, Stack, Text } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

export default function PreSearchState() {
  return (
    <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
      <Stack align="center" gap={4} ta="center">
        <MagnifyingGlassIcon
          size={28}
          color="var(--mantine-color-trail-green-6)"
        />
        <Text fw={700} mt="xs">
          Find an account
        </Text>
        <Text size="sm" c="dimmed" maw={360}>
          Start typing a name or email above. Results update as you type — the
          more specific the query, the shorter the list.
        </Text>
      </Stack>
    </Paper>
  );
}
