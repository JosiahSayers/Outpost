import { usePackingList } from "$/frontend/packing-list/packing-list-context";
import { Text, Textarea } from "@mantine/core";
import { useState } from "react";

interface Props {
  value: string | null;
  onSave?: (description: string) => void;
}

export default function PackingListDescription({ value, onSave }: Props) {
  const { editable } = usePackingList();
  // `value` is the source of truth (driven by the React Query cache); only the
  // in-progress edit lives locally so the displayed text never diverges.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const commit = () => {
    const description = draft.trim();
    // Persist any change, including clearing the description back to empty.
    if (description !== (value ?? "")) {
      onSave?.(description);
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editable && editing) {
    return (
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        autosize
        minRows={1}
        size="sm"
        maw={560}
        w="100%"
      />
    );
  }

  // Nothing to show for read-only viewers when there's no description.
  if (!value && !editable) return null;

  return (
    <Text
      c="dimmed"
      size="sm"
      maw={560}
      fs={value ? undefined : "italic"}
      onClick={
        editable
          ? () => {
              setDraft(value ?? "");
              setEditing(true);
            }
          : undefined
      }
      style={editable ? { cursor: "pointer" } : undefined}
    >
      {value || "Add a description"}
    </Text>
  );
}
