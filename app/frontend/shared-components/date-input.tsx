import { highlightSelectedDate } from "$/frontend/utils/highlight-selected-date";
import {
  DateInput as MantineDateInput,
  type DateInputProps,
} from "@mantine/dates";

export default function DateInput({ value, ...props }: DateInputProps) {
  return (
    <MantineDateInput
      value={value}
      placeholder="Pick a date"
      firstDayOfWeek={0}
      clearable
      getDayProps={highlightSelectedDate(
        typeof value === "string" ? value : null,
      )}
      {...props}
    />
  );
}
