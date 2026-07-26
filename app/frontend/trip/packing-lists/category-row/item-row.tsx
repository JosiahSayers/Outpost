import type { MergedPackingCategory } from "$/frontend/trip/placeholder-data";
import { ActionIcon, Badge, Checkbox, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { ProhibitIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  item: MergedPackingCategory["items"][number];
  multiList: boolean;
  onTogglePacked: (itemId: string, packed: boolean) => void;
  onToggleNotNeeded: (itemId: string, notNeeded: boolean) => void;
}

export default function ItemRow({
  item,
  multiList,
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
        checked={item.packed}
        onChange={(e) => onTogglePacked(item.id, e.currentTarget.checked)}
      />
      <Text
        size="sm"
        c={item.packed ? "dimmed" : undefined}
        style={{ flex: 1 }}
        truncate="end"
      >
        {item.name}
      </Text>

      {multiList && (
        <Badge color="gray" variant="light" size="xs" style={{ flexShrink: 0 }}>
          {item.listName}
        </Badge>
      )}

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
