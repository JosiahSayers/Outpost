import ExcludedItems from "$/frontend/trip/packing-lists/category-row/excluded-items";
import type { MergedPackingCategory } from "$/frontend/trip/placeholder-data";
import { Badge, Card, Collapse, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";
import ItemRow from "./item-row";

// The dot is a status summary, not a category label: unstarted, in progress,
// or fully packed, in the same three on-brand colors as everywhere else.
function statusColor(packedCount: number, total: number): string {
  if (total > 0 && packedCount === total) return "trail-green";
  if (packedCount > 0) return "trail-dust";
  return "bark-brown";
}

interface Props {
  category: MergedPackingCategory;
  onTogglePacked: (itemId: string, packed: boolean) => void;
  onToggleNotNeeded: (itemId: string, notNeeded: boolean) => void;
}

export default function CategoryRow({
  category,
  onTogglePacked,
  onToggleNotNeeded,
}: Props) {
  const [opened, { toggle }] = useDisclosure(false);

  const activeItems = category.items.filter((item) => !item.notNeeded);
  const excludedItems = category.items.filter((item) => item.notNeeded);
  const packedCount = activeItems.filter((item) => item.packed).length;
  const multiList = new Set(category.items.map((item) => item.listId)).size > 1;

  return (
    <Card withBorder padding="sm">
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="xs"
        onClick={toggle}
        style={{ cursor: "pointer" }}
      >
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: `var(--mantine-color-${statusColor(packedCount, activeItems.length)}-6)`,
            }}
          />
          <Text fw={600} size="sm" truncate="end">
            {category.name}
          </Text>
          {excludedItems.length > 0 && (
            <Badge
              color="gray"
              variant="light"
              size="xs"
              style={{ flexShrink: 0 }}
            >
              {excludedItems.length} not needed
            </Badge>
          )}
        </Group>
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text
            size="sm"
            c="dimmed"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {packedCount}/{activeItems.length}
          </Text>
          <CaretDownIcon
            size={14}
            style={{
              transform: opened ? "rotate(180deg)" : undefined,
              transition: "transform 150ms ease",
              flexShrink: 0,
            }}
          />
        </Group>
      </Group>

      <Collapse expanded={opened}>
        <Stack gap={2} mt="sm">
          {activeItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              multiList={multiList}
              onTogglePacked={onTogglePacked}
              onToggleNotNeeded={onToggleNotNeeded}
            />
          ))}

          {excludedItems.length > 0 && (
            <ExcludedItems
              items={excludedItems}
              onToggleNotNeeded={onToggleNotNeeded}
            />
          )}
        </Stack>
      </Collapse>
    </Card>
  );
}
