import type { AdminNavItem } from "$/frontend/admin/shell/nav-items";
import { Stack, Text, UnstyledButton } from "@mantine/core";
import { Link, useRoute } from "wouter";

interface BottomNavLinkProps {
  item: AdminNavItem;
}

export default function BottomNavLink({ item }: BottomNavLinkProps) {
  const [isActive] = useRoute(item.href);
  const Icon = item.icon;
  const color = item.comingSoon
    ? "stone-gray.4"
    : isActive
      ? "trail-green.7"
      : "stone-gray.6";

  const content = (
    <Stack gap={2} align="center" py={4} px={6} c={color}>
      <Icon size={20} weight={isActive ? "fill" : "regular"} />
      <Text size="10px" fw={600}>
        {item.label === "Overview" ? "Home" : item.label}
      </Text>
    </Stack>
  );

  if (item.comingSoon) {
    return content;
  }

  if (item.external) {
    return (
      <UnstyledButton component="a" href={item.href}>
        {content}
      </UnstyledButton>
    );
  }

  return (
    <UnstyledButton component={Link} href={item.href}>
      {content}
    </UnstyledButton>
  );
}
