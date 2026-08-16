import { Group, Stack, Text } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import type { ReactNode } from "react";
import { useState } from "react";

interface Props {
  icon: ReactNode;
  value: string; // "HH:mm", empty string when unset
  placeholder: string;
  label: string;
  onSave: (value: string) => void;
}

function formatTime(value: string): string {
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export default function TimeField({
  icon,
  value,
  placeholder,
  label,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [incomplete, setIncomplete] = useState(false);

  const commit = () => {
    // A native time input only reports a value once hour, minute, and
    // AM/PM are all filled in — while any section is blank it reports ""
    // instead of falling back to the previous value. Stay in edit mode so
    // an incomplete entry isn't silently thrown away.
    if (!draft) {
      setIncomplete(true);
      return;
    }
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <Stack gap={2}>
        <TimeInput
          size="sm"
          w={120}
          value={draft}
          onChange={(e) => {
            setDraft(e.currentTarget.value);
            setIncomplete(false);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          leftSection={icon}
          aria-label={label}
          autoFocus
        />
        {incomplete && (
          <Text size="xs" c="red">
            Fill in hour, minute, and AM/PM to save
          </Text>
        )}
      </Stack>
    );
  }

  return (
    <Group
      gap={6}
      c="dimmed"
      wrap="nowrap"
      onClick={() => {
        setDraft(value);
        setIncomplete(false);
        setEditing(true);
      }}
      style={{ cursor: "pointer" }}
    >
      {icon}
      <Text size="sm" fs={value ? undefined : "italic"}>
        {value ? formatTime(value) : placeholder}
      </Text>
    </Group>
  );
}
