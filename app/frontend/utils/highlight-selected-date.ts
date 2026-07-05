// The calendar's built-in `selected` styling is easy to miss, so explicitly
// call out the currently selected day with its own border.
export const highlightSelectedDate =
  (selected: string | null) => (date: string) =>
    date === selected
      ? {
          style: {
            fontWeight: 700,
            border: "2px solid var(--mantine-primary-color-filled)",
          },
        }
      : {};
