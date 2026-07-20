import BottomNavLink from "$/frontend/admin/shell/bottom-nav-link";
import { ADMIN_NAV_ITEMS } from "$/frontend/admin/shell/nav-items";
import {
  Badge,
  Drawer,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DotsThreeCircleIcon } from "@phosphor-icons/react";

// The bottom bar only has room for a handful of icons — the rest live behind
// "More" so mobile doesn't need a different information architecture than
// the sidebar, just a different way to reach it.
const PRIMARY_HREFS = [
  "/console",
  "/console/users",
  "/console/audit-log",
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
        <Stack gap="sm">
          {overflowItems.map((item) => (
            <Group key={item.href} justify="space-between" wrap="nowrap">
              <Group gap="xs" c={item.comingSoon ? "dimmed" : undefined}>
                <item.icon size={16} />
                <Text size="sm">{item.label}</Text>
              </Group>
              {item.comingSoon && (
                <Badge color="stone-gray" variant="light" size="xs">
                  Soon
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      </Drawer>
    </>
  );
}
