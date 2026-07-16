import type { AdminNavItem } from "$/frontend/admin/shell/nav-items";
import { Anchor, Badge, Card, Group, Text, ThemeIcon } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { Link } from "wouter";

interface ToolCardProps {
  tool: AdminNavItem;
  isPrimary: boolean;
}

export default function ToolCard({ tool, isPrimary }: ToolCardProps) {
  const { hovered, ref } = useHover<HTMLDivElement>();
  const Icon = tool.icon;
  const accentColor = isPrimary ? "trail-green" : "stone-gray";

  const card = (
    <Card
      ref={ref}
      withBorder
      padding="lg"
      style={{
        opacity: tool.comingSoon ? 0.8 : 1,
        borderColor: hovered
          ? `var(--mantine-color-${accentColor}-4)`
          : undefined,
        boxShadow: hovered ? "var(--mantine-shadow-sm)" : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
        transition:
          "border-color 100ms ease, box-shadow 100ms ease, transform 100ms ease",
        cursor: tool.comingSoon ? "not-allowed" : "pointer",
      }}
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <ThemeIcon size={34} radius="sm" variant="light" color={accentColor}>
          <Icon size={18} />
        </ThemeIcon>
        {tool.comingSoon && (
          <Badge color={accentColor} variant="light" size="xs">
            {isPrimary ? "Up next" : "Soon"}
          </Badge>
        )}
      </Group>

      <Text fw={700} size="sm" mb={4}>
        {tool.label}
      </Text>
      <Text size="xs" c="dimmed">
        {tool.description}
      </Text>
    </Card>
  );

  if (tool.comingSoon) {
    return card;
  }

  return (
    <Anchor
      href={tool.href}
      component={tool.external ? undefined : Link}
      underline="never"
      c="inherit"
    >
      {card}
    </Anchor>
  );
}
