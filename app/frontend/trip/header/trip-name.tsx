import { TextInput, Title } from "@mantine/core";
import { useState } from "react";

interface Props {
  value: string;
  onSave: (name: string) => void;
}

export default function TripName({ value, onSave }: Props) {
  // `value` is the source of truth (driven by the React Query cache); only the
  // in-progress edit lives locally so the displayed name never diverges.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const name = draft.trim();
    // A trip always needs a name; ignore an empty or unchanged edit.
    if (name && name !== value) {
      onSave(name);
    }
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <TextInput
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
        autoFocus
        styles={{
          input: {
            fontFamily: "var(--mantine-font-family-headings)",
            fontSize: "var(--mantine-h1-font-size)",
            fontWeight: "var(--mantine-h1-font-weight)" as unknown as number,
            lineHeight: 1.2,
            height: "auto",
          },
        }}
      />
    );
  }

  return (
    <Title
      order={1}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {value}
    </Title>
  );
}
