import { Paper, Stack, Text } from "@mantine/core";
import { UserCircleMinusIcon } from "@phosphor-icons/react";

interface Props {
  searchTerm: string;
}

export default function NoResultsState({ searchTerm }: Props) {
  return (
    <Paper withBorder p="xl" style={{ borderStyle: "dashed" }}>
      <Stack align="center" gap={4} ta="center">
        <UserCircleMinusIcon size={28} color="var(--mantine-color-red-6)" />
        <Text fw={700} mt="xs">
          No accounts match &ldquo;{searchTerm}&rdquo;
        </Text>
        <Text size="sm" c="dimmed" maw={360}>
          Check the spelling, or try just the email domain or last name instead
          of the full query.
        </Text>
      </Stack>
    </Paper>
  );
}
