import { Group, Text, TextInput } from "@mantine/core";
import type { ReactNode } from "react";
import { useState } from "react";

/** Wiring handed to a custom editor so it can drive the shared commit logic. */
export interface EditorProps {
  icon: ReactNode;
  draft: string;
  setDraft: (value: string) => void;
  /** Save and exit; pass an explicit value to commit something other than the draft. */
  commit: (explicit?: string) => void;
  cancel: () => void;
}

interface Props {
  icon: ReactNode;
  value: string | null;
  placeholder: string;
  onSave: (value: string) => void;
  /** Override the edit-mode input — e.g. to add autocomplete. */
  renderEditor?: (props: EditorProps) => ReactNode;
}

export default function TripTextField({
  icon,
  value,
  placeholder,
  onSave,
  renderEditor,
}: Props) {
  // `value` is the source of truth (driven by the React Query cache); only the
  // in-progress edit lives locally so the displayed text never diverges.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const commit = (explicit?: string) => {
    const next = (explicit ?? draft).trim();
    // Persist any change, including clearing the field back to empty.
    if (next !== (value ?? "")) {
      onSave(next);
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    if (renderEditor) {
      return renderEditor({ icon, draft, setDraft, commit, cancel });
    }
    return (
      <TextInput
        size="sm"
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        leftSection={icon}
      />
    );
  }

  return (
    <Group
      gap={6}
      c="dimmed"
      wrap="nowrap"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {icon}
      <Text size="sm" fs={value ? undefined : "italic"}>
        {value || placeholder}
      </Text>
    </Group>
  );
}
