import {
  ADMIN_NAV_ITEMS,
  type AdminNavItem,
} from "$/frontend/admin/shell/nav-items";
import { Badge, Box, NavLink, Text } from "@mantine/core";
import { Link, useRoute } from "wouter";

const SECTIONS = ["Support", "System"] as const;

function NavItemLink({ item }: { item: AdminNavItem }) {
  const [isActive] = useRoute(item.href);
  const Icon = item.icon;

  return (
    <NavLink
      component={item.external ? undefined : Link}
      href={item.href}
      label={item.label}
      leftSection={<Icon size={16} />}
      active={isActive}
      disabled={item.comingSoon}
      rightSection={
        item.comingSoon ? (
          <Badge color="stone-gray" variant="light" size="xs">
            Soon
          </Badge>
        ) : undefined
      }
    />
  );
}

export default function Sidebar() {
  const primaryItems = ADMIN_NAV_ITEMS.filter((item) => !item.section);

  return (
    <Box p="xs">
      {primaryItems.map((item) => (
        <NavItemLink item={item} key={item.href} />
      ))}

      {SECTIONS.map((section) => {
        const items = ADMIN_NAV_ITEMS.filter(
          (item) => item.section === section,
        );
        if (items.length === 0) {
          return null;
        }

        return (
          <Box key={section}>
            <Text
              size="10px"
              fw={700}
              tt="uppercase"
              c="dimmed"
              mt="md"
              mb={4}
              px="xs"
              style={{ letterSpacing: "0.08em" }}
            >
              {section}
            </Text>
            {items.map((item) => (
              <NavItemLink item={item} key={item.href} />
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
