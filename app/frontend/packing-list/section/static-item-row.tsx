import GearLine from "$/frontend/packing-list/section/gear-line";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { Text } from "@mantine/core";

interface Props {
  item: ClientPackingListItem;
}

/**
 * An item's name, quantity, and — when gear is assigned — the gear line
 * beneath it.
 *
 * This owns the vertical stack (rather than its callers) so the editable and
 * read-only rows lay gear out identically, and so the row's own controls stay
 * siblings of the whole block instead of the name alone.
 */
export default function StaticItemRow({ item }: Props) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          minWidth: 0,
        }}
      >
        <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate="end">
          {item.name}
        </Text>
        {item.quantity > 1 && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            ×{item.quantity}
          </Text>
        )}
      </div>
      {item.assignedGear && (
        <GearLine gear={item.assignedGear} quantity={item.quantity} />
      )}
    </div>
  );
}
