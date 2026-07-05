import { placeholderLinks } from "$/frontend/trip/placeholder-data";
import { Group, Paper, Stack, Text, Title } from "@mantine/core";
import { ArrowSquareOutIcon, LinkIcon } from "@phosphor-icons/react";

export default function Links() {
  return (
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
  );
}
