import { formatDateRange } from "$/frontend/dashboard/trip-card";
import { Group, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useState } from "react";

interface Props {
  start: string | null;
  end: string | null;
  onSave: (range: { start?: string | null; end?: string | null }) => void;
}

// Trip dates are stored as UTC-midnight instants and arrive here as full ISO
// datetimes (e.g. "2026-07-05T00:00:00.000Z"). dayjs (which the date pickers
// use internally) formats bare instants in the viewer's local timezone, which
// rolls a UTC-midnight timestamp back to the previous day for anyone west of
// UTC. Truncating to the bare "YYYY-MM-DD" date sidesteps that: with no time
// component to convert, it's parsed as-is regardless of local timezone.
const toDateOnly = (value: string | null) => value?.slice(0, 10) ?? null;

// The calendar's built-in `selected` styling is easy to miss, so explicitly
// call out the currently selected day with its own border.
const highlightSelected = (selected: string | null) => (date: string) =>
  date === selected
    ? {
        style: {
          fontWeight: 700,
          border: "2px solid var(--mantine-primary-color-filled)",
        },
      }
    : {};

export default function TripDates({ start, end, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const startDate = toDateOnly(start);
  const endDate = toDateOnly(end);

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
          value={startDate}
          defaultDate={startDate ?? undefined}
          onChange={(value) => {
            if (value !== startDate) onSave({ start: value });
          }}
          getDayProps={highlightSelected(startDate)}
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
          value={endDate}
          defaultDate={endDate ?? undefined}
          onChange={(value) => {
            if (value !== endDate) onSave({ end: value });
          }}
          getDayProps={highlightSelected(endDate)}
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
