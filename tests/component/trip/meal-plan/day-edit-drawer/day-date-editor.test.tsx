import DayDateEditor from "$/frontend/trip/meal-plan/day-edit-drawer/day-date-editor";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderComponent(
  date: string | null,
  onChange: (date: string | null) => void,
) {
  render(
    <MantineProvider>
      <DayDateEditor date={date} onChange={onChange} />
    </MantineProvider>,
  );
}

// The DateInput's Popover/focus-trap schedule macrotasks (rAF/setTimeout)
// that fire after this synchronous interaction returns; flushing them keeps
// later tests from seeing act() warnings bleed in. See
// feedback_happy_dom_quirks memory.
async function flushPendingMacrotasks() {
  await waitFor(() => {});
}

describe("in view mode", () => {
  it("renders the formatted date", () => {
    renderComponent("2026-08-15", mock());
    expect(screen.getByText("Aug 15")).toBeInTheDocument();
  });

  it("renders 'Add date' when there is no date", () => {
    renderComponent(null, mock());
    expect(screen.getByText("Add date")).toBeInTheDocument();
  });

  it("clicking enters edit mode with a date input", async () => {
    renderComponent("2026-08-15", mock());
    fireEvent.click(screen.getByText("Aug 15"));
    expect(screen.getByPlaceholderText("Pick a date")).toBeInTheDocument();
    await flushPendingMacrotasks();
  });
});

describe("in edit mode", () => {
  function enterEditMode(
    date: string | null,
    onChange: (date: string | null) => void,
  ) {
    renderComponent(date, onChange);
    fireEvent.click(screen.getByText(date ? "Aug 15" : "Add date"));
  }

  it("shows the input pre-filled with the current value", async () => {
    enterEditMode("2026-08-15", mock());
    expect(screen.getByPlaceholderText("Pick a date")).toHaveValue(
      "August 15, 2026",
    );
    await flushPendingMacrotasks();
  });

  it("changing the date calls onChange with the new value", async () => {
    const onChange = mock();
    enterEditMode("2026-08-15", onChange);
    fireEvent.change(screen.getByPlaceholderText("Pick a date"), {
      target: { value: "August 20, 2026" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toBe("2026-08-20");
    await flushPendingMacrotasks();
  });

  it("picking a date from an empty state calls onChange", async () => {
    const onChange = mock();
    enterEditMode(null, onChange);
    fireEvent.change(screen.getByPlaceholderText("Pick a date"), {
      target: { value: "August 20, 2026" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toBe("2026-08-20");
    await flushPendingMacrotasks();
  });

  it("does not call onChange when the value is unchanged", async () => {
    const onChange = mock();
    enterEditMode("2026-08-15", onChange);
    fireEvent.change(screen.getByPlaceholderText("Pick a date"), {
      target: { value: "August 15, 2026" },
    });
    expect(onChange).not.toHaveBeenCalled();
    await flushPendingMacrotasks();
  });

  it("pressing Escape returns to view mode", async () => {
    enterEditMode("2026-08-15", mock());
    fireEvent.keyDown(screen.getByPlaceholderText("Pick a date"), {
      key: "Escape",
    });
    expect(screen.getByText("Aug 15")).toBeInTheDocument();
    await flushPendingMacrotasks();
  });

  it("blurring returns to view mode", async () => {
    enterEditMode("2026-08-15", mock());
    fireEvent.blur(screen.getByPlaceholderText("Pick a date"));
    expect(screen.getByText("Aug 15")).toBeInTheDocument();
    await flushPendingMacrotasks();
  });
});
