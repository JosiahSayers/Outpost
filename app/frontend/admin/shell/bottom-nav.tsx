import BottomNavLink from "$/frontend/admin/shell/bottom-nav-link";
import {
  ADMIN_NAV_ITEMS,
  type AdminNavItem,
} from "$/frontend/admin/shell/nav-items";
import AppLink from "$/frontend/app-link";
import {
  Badge,
  Drawer,
  Group,
  NavLink,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DotsThreeCircleIcon } from "@phosphor-icons/react";
import { useRoute } from "wouter";

function OverflowItemLink({
  item,
  onNavigate,
}: {
  item: AdminNavItem;
  onNavigate: () => void;
}) {
  const [isActive] = useRoute(item.href);
  const Icon = item.icon;

  return (
    <NavLink
      component={item.external ? undefined : AppLink}
      href={item.href}
      onClick={item.comingSoon ? undefined : onNavigate}
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

// The bottom bar only has room for a handful of icons — the rest live behind
// "More" so mobile doesn't need a different information architecture than
// the sidebar, just a different way to reach it.
const PRIMARY_HREFS = [
  "/console",
  "/console/users",
  "/console/feedback",
  "/console/queues",
];

export default function BottomNav() {
  const [moreOpened, { open: openMore, close: closeMore }] =
    useDisclosure(false);
  const primaryItems = ADMIN_NAV_ITEMS.filter((item) =>
    PRIMARY_HREFS.includes(item.href),
  );
  const overflowItems = ADMIN_NAV_ITEMS.filter(
    (item) => !PRIMARY_HREFS.includes(item.href),
  );

  return (
    <>
      <Group
        hiddenFrom="sm"
        justify="space-around"
        gap={0}
        wrap="nowrap"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "var(--mantine-color-body)",
          borderTop: "1px solid var(--mantine-color-default-border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {primaryItems.map((item) => (
          <BottomNavLink item={item} key={item.href} />
        ))}
        <UnstyledButton onClick={openMore}>
          <Stack gap={2} align="center" py={4} px={6} c="stone-gray.6">
            <DotsThreeCircleIcon size={20} />
            <Text size="10px" fw={600}>
              More
            </Text>
          </Stack>
        </UnstyledButton>
      </Group>

      <Drawer
        opened={moreOpened}
        onClose={closeMore}
        title="More tools"
        position="bottom"
        size="xs"
      >
        <Stack gap={0}>
          {overflowItems.map((item) => (
            <OverflowItemLink
              item={item}
              key={item.href}
              onNavigate={closeMore}
            />
          ))}
        </Stack>
      </Drawer>
    </>
  );
}
