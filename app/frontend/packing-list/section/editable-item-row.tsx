import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import StaticItemRow from "$/frontend/packing-list/section/static-item-row";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import {
  ActionIcon,
  Badge,
  Group,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { DotsSixVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

interface Props {
  item: ClientPackingListItem;
  onToggleOptional: () => void;
  onEdit: (item: ClientPackingListItem) => void;
  onDelete: () => void;
  autoEdit: boolean;
}

export default function EditableItemRow({
  item,
  onToggleOptional,
  onEdit,
  onDelete,
  autoEdit,
}: Props) {
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so CRUD controls and the drag handle must stay
  // visible unconditionally rather than waiting for a mouseenter that never fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const [confirmOpened, confirm] = useDisclosure(false);
  const [editing, setEditing] = useState(autoEdit);
  const [draftName, setDraftName] = useState(item.name);
  const [draftQuantity, setDraftQuantity] = useState(item.quantity);
  // Select the placeholder name only on the initial auto-edit of a new item,
  // not on subsequent manual edits.
  const selectOnFocus = useRef(autoEdit);
  const { active: dndActive } = useDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const startEditing = () => {
    setDraftName(item.name);
    setDraftQuantity(item.quantity);
    setEditing(true);
  };
  const commit = () => {
    const name = draftName.trim();
    if (name) onEdit({ ...item, name, quantity: draftQuantity });
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <Group
        gap={4}
        my={2}
        onBlur={(e) => {
          // Commit only when focus leaves the row entirely (e.g. tabbing from
          // the name field to the quantity stepper should not commit).
          if (!e.currentTarget.contains(e.relatedTarget as Node)) commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
      >
        <TextInput
          value={draftName}
          onChange={(e) => setDraftName(e.currentTarget.value)}
          autoFocus
          onFocus={(e) => {
            if (selectOnFocus.current) {
              e.currentTarget.select();
              selectOnFocus.current = false;
            }
          }}
          size="xs"
          flex={1}
          aria-label="Item name"
        />
        <NumberInput
          value={draftQuantity}
          onChange={(val) =>
            setDraftQuantity(typeof val === "number" ? val : 1)
          }
          min={1}
          allowDecimal={false}
          size="xs"
          w={70}
          aria-label="Quantity"
        />
      </Group>
    );
  }

  const showControls =
    (hovered || isTouchDevice) && !isDragging && dndActive === null;

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 6,
        paddingRight: 6,
        // Drop scaleX/scaleY from the dnd-kit transform — the scale causes long
        // rows to squish vertically during drag with verticalListSortingStrategy.
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: "pointer",
        borderRadius: "var(--mantine-radius-sm)",
        background:
          showControls && !isTouchDevice
            ? "var(--mantine-color-default-hover)"
            : undefined,
        margin: "0 -6px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={startEditing}
    >
      <ActionIcon
        variant="transparent"
        color="gray"
        size="xs"
        style={{
          visibility: showControls ? "visible" : "hidden",
          cursor: "grab",
          flexShrink: 0,
          // Without this, touchstart on the handle is interpreted as a page
          // scroll before dnd-kit's PointerSensor can claim the gesture.
          touchAction: "none",
        }}
        {...listeners}
        {...attributes}
        aria-label={`Reorder ${item.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <DotsSixVerticalIcon size={12} />
      </ActionIcon>
      <StaticItemRow item={item} />
      <Badge
        variant={
          item.optional && !showControls
            ? "transparent"
            : item.optional
              ? "light"
              : "outline"
        }
        color="gray"
        size="sm"
        opacity={item.optional && !showControls ? 0.45 : 1}
        style={{
          cursor: "pointer",
          flexShrink: 0,
          visibility: item.optional || showControls ? "visible" : "hidden",
          userSelect: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOptional();
        }}
      >
        {item.optional && showControls ? "Optional ×" : "optional"}
      </Badge>
      <ActionIcon
        variant="subtle"
        color="red"
        size="xs"
        aria-label="Delete item"
        style={{
          visibility: showControls ? "visible" : "hidden",
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          confirm.open();
        }}
      >
        <TrashIcon size={12} />
      </ActionIcon>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={onDelete}
        title="Delete item?"
      >
        Remove <strong>{item.name}</strong> from this section? This can&apos;t
        be undone.
      </ConfirmDeleteModal>
    </div>
  );
}
