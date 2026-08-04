import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import ItemList from "$/frontend/packing-list/section/item-list";
import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import { Button, Divider, Stack, Text } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import SectionHeader from "./section-header";

interface Props {
  section: ClientPackingListSection & { items: ClientPackingListItem[] };
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  autoEdit: boolean;
  onAddItem: () => void;
  onToggleOptional: (item: ClientPackingListItem) => void;
  onReorderItem: (item: ClientPackingListItem, sortPosition: number) => void;
}

export default function SectionContent({
  section,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
  autoEdit,
  onAddItem,
  onToggleOptional,
  onReorderItem,
}: Props) {
  const { editable } = usePackingList();
  // Items render straight from the cache-fed prop. A section's positions span
  // both groups, so split by `optional` then sort each independently.
  const requiredItems = sortByPosition(
    section.items.filter((i) => !i.optional),
  );
  const optionalItems = sortByPosition(section.items.filter((i) => i.optional));

  return (
    <Stack gap="xs" pb="xl" style={{ breakInside: "avoid" }}>
      <SectionHeader
        name={section.name}
        items={section.items}
        isFirst={isFirst}
        isLast={isLast}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRename={onRename}
        onDelete={onDelete}
        autoEdit={autoEdit}
      />
      <Divider />
      <ItemList
        items={requiredItems}
        sectionId={section.id}
        onReorder={onReorderItem}
        onToggleOptional={onToggleOptional}
      />

      {optionalItems.length > 0 && (
        <>
          <Text fw={600} size="xs" tt="uppercase" c="dimmed" mt="md">
            Optional
          </Text>
          <ItemList
            items={optionalItems}
            sectionId={section.id}
            onReorder={onReorderItem}
            onToggleOptional={onToggleOptional}
          />
        </>
      )}

      {editable && (
        <Button
          variant="subtle"
          size="xs"
          leftSection={<PlusIcon size={12} />}
          justify="flex-start"
          mt="xs"
          color="gray"
          onClick={onAddItem}
        >
          Add item
        </Button>
      )}
    </Stack>
  );
}
