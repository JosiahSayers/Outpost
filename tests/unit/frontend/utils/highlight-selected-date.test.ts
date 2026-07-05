import { highlightSelectedDate } from "$/frontend/utils/highlight-selected-date";
import { describe, expect, it } from "bun:test";

describe("highlightSelectedDate", () => {
  it("returns a bold, bordered style for the selected date", () => {
    const getDayProps = highlightSelectedDate("2026-07-05");
    expect(getDayProps("2026-07-05")).toEqual({
      style: {
        fontWeight: 700,
        border: "2px solid var(--mantine-primary-color-filled)",
      },
    });
  });

  it("returns an empty object for a non-selected date", () => {
    const getDayProps = highlightSelectedDate("2026-07-05");
    expect(getDayProps("2026-07-06")).toEqual({});
  });

  it("returns an empty object for every date when nothing is selected", () => {
    const getDayProps = highlightSelectedDate(null);
    expect(getDayProps("2026-07-05")).toEqual({});
  });
});
