import { GEAR_INVENTORY_GRID_COLUMNS } from "$/frontend/gear-inventory/table-grid";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { ActionIcon, Collapse, Divider, Group, Text } from "@mantine/core";
import { CaretDownIcon, PencilSimple, Trash } from "@phosphor-icons/react";

interface Props {
  name: string;
  items: Array<ClientGearInventoryItem>;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (item: ClientGearInventoryItem) => void;
  onDelete: (item: ClientGearInventoryItem) => void;
  formatWeight: (grams: number | null) => string;
}

export default function CategorySection({
  name,
  items,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  formatWeight,
}: Props) {
  return (
    <div>
      <Group
        gap="xs"
        align="center"
        pt="lg"
        pb="xs"
        onClick={onToggle}
        style={{ cursor: "pointer" }}
      >
        <Text
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          style={{ letterSpacing: "0.08em" }}
        >
          {name}
        </Text>
        <Text size="xs" c="dimmed">
          ({items.length})
        </Text>
        <Divider style={{ flex: 1 }} />
        <CaretDownIcon
          size={14}
          color="var(--mantine-color-dimmed)"
          style={{
            transform: expanded ? "rotate(180deg)" : undefined,
            transition: "transform 150ms ease",
            flexShrink: 0,
          }}
        />
      </Group>

      <Collapse expanded={expanded}>
        {items.map((item) => (
          <div
            key={item.id}
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: GEAR_INVENTORY_GRID_COLUMNS,
              alignItems: "center",
              padding: "7px var(--mantine-spacing-xs)",
            }}
          >
            <Text size="sm" fw={500}>
              {item.name}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {item.quantity}
            </Text>
            <Text size="sm" c="dimmed" ta="right">
              {formatWeight(item.grams)}
            </Text>
            <Group gap={4} justify="flex-end">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={`Edit ${item.name}`}
                onClick={() => onEdit(item)}
              >
                <PencilSimple size={14} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={`Delete ${item.name}`}
                onClick={() => onDelete(item)}
              >
                <Trash size={14} />
              </ActionIcon>
            </Group>
          </div>
        ))}
      </Collapse>
    </div>
  );
}
