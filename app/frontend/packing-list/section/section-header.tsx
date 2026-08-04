import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import GearProgress from "$/frontend/packing-list/section/gear-progress";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { ActionIcon, Group, TextInput, Title } from "@mantine/core";
import { useDisclosure, useHover, useMediaQuery } from "@mantine/hooks";
import { CaretDownIcon, CaretUpIcon, TrashIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

interface Props {
  listId: string;
  sectionId: string;
  name: string;
  items: ClientPackingListItem[];
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  autoEdit: boolean;
}

export default function SectionHeader({
  listId,
  sectionId,
  name,
  items,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRename,
  onDelete,
  autoEdit,
}: Props) {
  const { editable } = usePackingList();
  const { hovered, ref } = useHover<HTMLDivElement>();
  // Touch devices can't hover, so the section controls must stay visible
  // unconditionally rather than waiting for a mouseenter that never fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(name);
  const [confirmOpened, confirm] = useDisclosure(false);
  // Select the placeholder name only on the initial auto-edit of a new section,
  // not on subsequent manual renames.
  const selectOnFocus = useRef(autoEdit);

  if (!editable) {
    return <Title order={5}>{name}</Title>;
  }

  if (editing) {
    const commit = () => {
      const next = draft.trim();
      if (next) onRename(next);
      setEditing(false);
    };
    return (
      <TextInput
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        onFocus={(e) => {
          if (selectOnFocus.current) {
            e.currentTarget.select();
            selectOnFocus.current = false;
          }
        }}
        styles={{
          input: {
            fontFamily: "var(--mantine-font-family-headings)",
            fontSize: "var(--mantine-h5-font-size)",
            fontWeight: "var(--mantine-h5-font-weight)" as unknown as number,
            height: "auto",
          },
        }}
      />
    );
  }

  return (
    <Group
      ref={ref}
      justify="space-between"
      align="center"
      gap="xs"
      wrap="nowrap"
    >
      <Title
        order={5}
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        style={{
          cursor: "pointer",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </Title>
      {/* Sits in the row the header already occupies, so the count and the
          running weight cost no vertical space. Editable lists only: on a list
          you can't change, "0 of 4 assigned" would invite an action that isn't
          available. */}
      <GearProgress listId={listId} sectionId={sectionId} items={items} />
      <Group
        gap={2}
        style={{
          visibility: hovered || isTouchDevice ? "visible" : "hidden",
          flexShrink: 0,
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          size="xs"
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label="Move section up"
        >
          <CaretUpIcon size={12} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="xs"
          disabled={isLast}
          onClick={onMoveDown}
          aria-label="Move section down"
        >
          <CaretDownIcon size={12} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          size="xs"
          onClick={confirm.open}
          aria-label="Delete section"
        >
          <TrashIcon size={12} />
        </ActionIcon>
      </Group>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={onDelete}
        title="Delete section?"
      >
        Delete <strong>{name}</strong> and all of its items? This can&apos;t be
        undone.
      </ConfirmDeleteModal>
    </Group>
  );
}
