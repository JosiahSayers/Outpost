import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Group, Text } from "@mantine/core";
import { BackpackIcon } from "@phosphor-icons/react";

interface Props {
  gear: ClientGearInventoryItem;
  /** Packing list quantity, so the line shows this item's real contribution. */
  quantity: number;
}

/**
 * The assigned-gear caption: a second line under the item name carrying the
 * gear's name and weight.
 *
 * It gets its own line rather than sitting inline because a masonry column is
 * only 260px wide and the item name already claims most of it — sharing that
 * line leaves the gear name a couple of characters. Nothing here is
 * hover-gated: on touch there is no hover, so anything hidden behind it would
 * be unreachable.
 *
 * Purely a label. Changing the assignment happens in the item drawer, which
 * the whole row opens — a tap target of its own here would be one more small
 * thing to miss on a phone.
 */
export default function GearLine({ gear, quantity }: Props) {
  const formatWeight = useWeightDisplay();
  const grams = gear.grams === null ? null : gear.grams * quantity;
  const weight = formatWeight(grams);

  return (
    <Group gap={4} wrap="nowrap" c="bark-brown.7" style={{ minWidth: 0 }}>
      <BackpackIcon
        size={11}
        color="var(--mantine-color-bark-brown-6)"
        style={{ flexShrink: 0 }}
      />
      <Text size="xs" truncate="end" style={{ minWidth: 0 }}>
        {gear.name}
      </Text>
      {weight && (
        <Text size="xs" opacity={0.75} style={{ flexShrink: 0 }}>
          {weight}
        </Text>
      )}
    </Group>
  );
}
