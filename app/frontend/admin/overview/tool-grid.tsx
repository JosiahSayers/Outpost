import { TOOL_DESCRIPTIONS } from "$/frontend/admin/overview/mock-data";
import { ADMIN_NAV_ITEMS } from "$/frontend/admin/shell/nav-items";
import { Badge, Card, Group, SimpleGrid, Text, ThemeIcon } from "@mantine/core";

export default function ToolGrid() {
  const tools = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/console");

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isPrimary = tool.label === "User Search";

        return (
          <Card
            key={tool.href}
            withBorder
            padding="lg"
            style={{ opacity: tool.comingSoon ? 0.8 : 1 }}
          >
            <Group justify="space-between" align="flex-start" mb="xs">
              <ThemeIcon
                size={34}
                radius="sm"
                variant="light"
                color={isPrimary ? "trail-green" : "stone-gray"}
              >
                <Icon size={18} />
              </ThemeIcon>
              <Badge
                color={isPrimary ? "trail-green" : "stone-gray"}
                variant="light"
                size="xs"
              >
                {isPrimary ? "Up next" : "Soon"}
              </Badge>
            </Group>

            <Text fw={700} size="sm" mb={4}>
              {tool.label}
            </Text>
            <Text size="xs" c="dimmed">
              {TOOL_DESCRIPTIONS[tool.href]}
            </Text>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
