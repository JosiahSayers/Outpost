import { Group, Text } from "@mantine/core";
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

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <TimeInput
        size="sm"
        w={120}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        leftSection={icon}
        aria-label={label}
        autoFocus
      />
    );
  }

  return (
    <Group
      gap={6}
      c="dimmed"
      wrap="nowrap"
      onClick={() => {
        setDraft(value);
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
