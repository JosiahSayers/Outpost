import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import StaticItemRow from "$/frontend/packing-list/section/static-item-row";
import {
  gearStateFor,
  useGearTrackedMap,
} from "$/frontend/utils/api/gear-assignment";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { ActionIcon, Badge } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DotsSixVerticalIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  item: ClientPackingListItem;
  sectionId: string;
  onToggleOptional: () => void;
}

/**
 * One row of an editable packing list.
 *
 * The row itself is a single tap target that opens the item drawer; renaming,
 * quantity, gear and delete all live there. Only two things are handled in
 * place — dragging to reorder, and the optional badge — because those are
 * quick, repeated passes down a list where opening a drawer each time would be
 * worse. Everything else was too small to hit reliably on a phone.
 */
export default function EditableItemRow({
  item,
  sectionId,
  onToggleOptional,
}: Props) {
  const { openItem } = usePackingList();
  const gearTracked = useGearTrackedMap();
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so the drag handle must stay visible
  // unconditionally rather than waiting for a mouseenter that never fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const { active: dndActive } = useDndContext();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const showControls =
    (hovered || isTouchDevice) && !isDragging && dndActive === null;
  const gearState = gearStateFor(item, gearTracked);
  const open = openItem ? () => openItem(sectionId, item) : undefined;

  return (
    <div
      ref={setNodeRef}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      aria-label={open ? `Edit ${item.name}` : undefined}
      style={{
        display: "flex",
        // An assigned row is two lines tall; keep the handle and the badge
        // beside the name rather than floating them against the gear line.
        alignItems: gearState === "assigned" ? "flex-start" : "center",
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
        cursor: open ? "pointer" : undefined,
        borderRadius: "var(--mantine-radius-sm)",
        background:
          showControls && !isTouchDevice
            ? "var(--mantine-color-default-hover)"
            : undefined,
        margin: "0 -6px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={open}
      onKeyDown={(e) => {
        if (!open) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
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
      {/* An indicator, not a control: it marks a row that still owes a gear
          decision, which is the only sign the feature exists on a list where
          nothing is assigned yet. Tapping it just opens the drawer along with
          the rest of the row, so it costs no extra touch target. */}
      {gearState === "undecided" && open && (
        <span
          role="img"
          aria-label="No gear assigned"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            flexShrink: 0,
            borderRadius: "var(--mantine-radius-sm)",
            border: "1px dashed var(--mantine-color-default-border)",
            color: "var(--mantine-color-dimmed)",
          }}
        >
          <PlusIcon size={10} />
        </span>
      )}
    </div>
  );
}
