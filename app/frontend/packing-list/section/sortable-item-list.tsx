import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import EditableItemRow from "./editable-item-row";

export interface SortableItemListProps {
  items: ClientPackingListItem[];
  sectionId: string;
  onReorder: (item: ClientPackingListItem, sortPosition: number) => void;
  onToggleOptional: (item: ClientPackingListItem) => void;
  onEditItem: (item: ClientPackingListItem) => void;
  onDeleteItem: (item: ClientPackingListItem) => void;
  autoEditItemId: string | null;
}

export default function SortableItemList({
  items,
  sectionId,
  onReorder,
  onToggleOptional,
  onEditItem,
  onDeleteItem,
  autoEditItemId,
}: SortableItemListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const dragged = items[oldIndex]!;
    const target = items[newIndex]!;
    // Persist by placing the dragged item relative to its drop target: before
    // it when moving up, after it when moving down. The backend's
    // insert-and-push-down logic resolves the rest (see useUpdateItem).
    const sortPosition =
      newIndex > oldIndex ? target.sortPosition + 1 : target.sortPosition;
    onReorder(dragged, sortPosition);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <EditableItemRow
            key={item.id}
            item={item}
            sectionId={sectionId}
            onToggleOptional={() => onToggleOptional(item)}
            onEdit={onEditItem}
            onDelete={() => onDeleteItem(item)}
            autoEdit={item.id === autoEditItemId}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
