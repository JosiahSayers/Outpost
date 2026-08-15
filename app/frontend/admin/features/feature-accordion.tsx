import FeaturePanel from "$/frontend/admin/features/feature-panel";
import type { Features } from "$/utils/features";
import { Accordion, Box, Group, Text } from "@mantine/core";

interface Props {
  feature: ReturnType<typeof Features.featureList>[number];
  isOpen: boolean;
}

export default function FeatureAccordion({ feature, isOpen }: Props) {
  return (
    <Accordion.Item value={feature.feature}>
      <Accordion.Control>
        <Group wrap="wrap" align="center" gap="md">
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
      <Accordion.Panel p={{ md: "md" }}>
        <FeaturePanel feature={feature.feature} isOpen={isOpen} />
      </Accordion.Panel>
    </Accordion.Item>
  );
}
