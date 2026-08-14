import type { Features } from "$/utils/features";
import { Accordion, Box, Group, Text } from "@mantine/core";

interface Props {
  feature: ReturnType<typeof Features.featureList>[number];
}

export default function FeatureAccordion({ feature }: Props) {
  return (
    <Accordion.Item value={feature.feature}>
      <Accordion.Control>
        <Group wrap="wrap" align="flex-start" gap="md">
          <Box miw={160} style={{ flexShrink: 0 }}>
            <Text fw={700} size="sm">
              {feature.name}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace" mt={2}>
              {feature.feature}
            </Text>
          </Box>
          <Text size="sm" c="dimmed" style={{ flex: "1 1 220px" }}>
            {feature.description}
          </Text>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Text size="sm" c="dimmed" fs="italic">
          Status controls for this flag will go here.
        </Text>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
