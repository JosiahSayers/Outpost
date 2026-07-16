import ToolCard from "$/frontend/admin/overview/tool-card";
import { ADMIN_NAV_ITEMS } from "$/frontend/admin/shell/nav-items";
import { SimpleGrid } from "@mantine/core";

export default function ToolGrid() {
  const tools = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/console");

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
      {tools.map((tool) => (
        <ToolCard
          key={tool.href}
          tool={tool}
          isPrimary={tool.label === "User Search"}
        />
      ))}
    </SimpleGrid>
  );
}
