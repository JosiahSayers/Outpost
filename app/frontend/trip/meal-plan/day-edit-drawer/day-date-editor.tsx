import DateInput from "$/frontend/shared-components/date-input";
import { formatMealDate } from "$/frontend/trip/meal-plan/helpers";
import { Text } from "@mantine/core";
import { useState } from "react";

interface Props {
  date: string | null;
  onChange: (date: string | null) => void;
}

export default function DayDateEditor({ date, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <DateInput
        value={date}
        defaultDate={date ?? undefined}
        onChange={(value) => {
          if (value !== date) onChange(value);
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        size="sm"
        w={140}
        autoFocus
      />
    );
  }

  return (
    <Text
      size="sm"
      c="dimmed"
      onClick={() => setEditing(true)}
      style={{ cursor: "pointer" }}
    >
      {date ? formatMealDate(date) : "Add date"}
    </Text>
  );
}
