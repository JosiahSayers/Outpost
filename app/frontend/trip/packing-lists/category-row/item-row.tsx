import GearLine from "$/frontend/packing-list/section/gear-line";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { ActionIcon, Checkbox, Group, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { ProhibitIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  item: ClientTripPackingListItem;
  onTogglePacked: (itemId: string, packed: boolean) => void;
  onToggleNotNeeded: (itemId: string, notNeeded: boolean) => void;
}

export default function ItemRow({
  item,
  onTogglePacked,
  onToggleNotNeeded,
}: Props) {
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so the "not needed" action must stay visible
  // unconditionally rather than waiting for a mouseenter that never fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const showControls = hovered || isTouchDevice;

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      px={4}
      py={4}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderRadius: "var(--mantine-radius-sm)" }}
    >
      <Checkbox
        aria-label={item.name}
        checked={item.status.packed}
        onChange={(e) => onTogglePacked(item.id, e.currentTarget.checked)}
      />
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={4} wrap="nowrap">
          <Text
            size="sm"
            c={item.status.packed ? "dimmed" : undefined}
            truncate="end"
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              ×{item.quantity}
            </Text>
          )}
        </Group>
        {item.assignedGear && (
          <GearLine gear={item.assignedGear} quantity={item.quantity} />
        )}
      </Stack>

      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label={`Mark ${item.name} as not needed for this trip`}
        title="Not needed for this trip"
        style={{
          visibility: showControls ? "visible" : "hidden",
          flexShrink: 0,
        }}
        onClick={() => onToggleNotNeeded(item.id, true)}
      >
        <ProhibitIcon size={14} />
      </ActionIcon>
    </Group>
  );
}
