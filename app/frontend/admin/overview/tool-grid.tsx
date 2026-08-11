import ToolCard from "$/frontend/admin/overview/tool-card";
import { ADMIN_NAV_ITEMS } from "$/frontend/admin/shell/nav-items";
import { SimpleGrid, Stack, Text } from "@mantine/core";

const SECTIONS = ["Support", "System"] as const;

export default function ToolGrid() {
  const tools = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/console");
  const pinnedTools = tools.filter((tool) => !tool.section);

  return (
    <Stack gap="lg">
      {pinnedTools.map((tool) => (
        <ToolCard key={tool.href} tool={tool} isPrimary variant="hero" />
      ))}

      {SECTIONS.map((section) => {
        const sectionTools = tools.filter((tool) => tool.section === section);
        if (sectionTools.length === 0) {
          return null;
        }

        return (
          <div key={section}>
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c="dimmed"
              mb="sm"
              style={{ letterSpacing: "0.06em" }}
            >
              {section}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              {sectionTools.map((tool) => (
                <ToolCard key={tool.href} tool={tool} isPrimary={false} />
              ))}
            </SimpleGrid>
          </div>
        );
      })}
    </Stack>
  );
}
