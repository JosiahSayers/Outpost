import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import SortableItemList, {
  type SortableItemListProps,
} from "$/frontend/packing-list/section/sortable-item-list";
import StaticItemRow from "$/frontend/packing-list/section/static-item-row";
import { Group } from "@mantine/core";

export default function ItemList({
  items,
  sectionId,
  onReorder,
  onToggleOptional,
}: SortableItemListProps) {
  const { editable } = usePackingList();

  return editable ? (
    <SortableItemList
      items={items}
      sectionId={sectionId}
      onReorder={onReorder}
      onToggleOptional={onToggleOptional}
    />
  ) : (
    items.map((item) => (
      <Group key={item.id} justify="space-between" py={4}>
        <StaticItemRow item={item} />
      </Group>
    ))
  );
}
