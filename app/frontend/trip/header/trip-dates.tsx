import { formatDateRange } from "$/frontend/dashboard/trip-card";
import { highlightSelectedDate } from "$/frontend/utils/highlight-selected-date";
import { Group, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  start: string | null;
  end: string | null;
  onSave: (range: { start?: string | null; end?: string | null }) => void;
}

export default function TripDates({ start, end, onSave }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Group
        gap={6}
        wrap="nowrap"
        onBlur={(e) => {
          // Exit edit mode once focus leaves both date fields, e.g. tabbing or
          // clicking away; a click inside either field's own calendar popover
          // keeps focus on the field, so it doesn't trigger this.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setEditing(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
      >
        <DateInput
          placeholder="Start date"
          value={start}
          defaultDate={start ?? undefined}
          onChange={(value) => {
            if (value !== start) onSave({ start: value });
          }}
          getDayProps={highlightSelectedDate(start)}
          size="sm"
          w={140}
          autoFocus
          firstDayOfWeek={0}
        />
        <Text c="dimmed" size="sm">
          –
        </Text>
        <DateInput
          placeholder="End date"
          value={end}
          defaultDate={end ?? undefined}
          onChange={(value) => {
            if (value !== end) onSave({ end: value });
          }}
          getDayProps={highlightSelectedDate(end)}
          size="sm"
          w={140}
          firstDayOfWeek={0}
        />
      </Group>
    );
  }

  return (
    <Group
      gap={6}
      c="dimmed"
      wrap="nowrap"
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer" }}
    >
      <CalendarBlankIcon size={15} />
      <Text size="sm">{formatDateRange(start, end)}</Text>
    </Group>
  );
}
