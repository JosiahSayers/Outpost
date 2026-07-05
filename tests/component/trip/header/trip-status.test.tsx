import TripStatusBadge from "$/frontend/trip/header/trip-status";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";
import type { TripStatus } from "../../../../generated/prisma/enums";

// `TripStatusBadge` is controlled — the displayed status comes from its
// `value` prop (the React Query cache in the real app). This wrapper stands
// in for that owner, updating the value when the status persists an edit.
function renderComponent(
  value: TripStatus = "planning",
  onSave?: (status: TripStatus) => void,
) {
  function Wrapper() {
    const [current, setCurrent] = useState<TripStatus>(value);
    return (
      <MantineProvider>
        <TripStatusBadge
          value={current}
          onSave={(status) => {
            onSave?.(status);
            setCurrent(status);
          }}
        />
      </MantineProvider>
    );
  }

  render(<Wrapper />);
}

// The Select's Popover/focus-trap schedule macrotasks (rAF/setTimeout) that
// fire after this synchronous interaction returns. `await waitFor(() => {})`
// flushes them while Testing Library's asyncWrapper safely has
// IS_REACT_ACT_ENVIRONMENT=false, avoiding act() warnings. It must run after
// the interaction completes, not between two clicks — inserting it mid-flow
// gives the focus trap a chance to run early and close the dropdown before
// the next click lands. See feedback_happy_dom_quirks memory.
async function flushPendingMacrotasks() {
  await waitFor(() => {});
}

describe("in view mode", () => {
  beforeEach(() => renderComponent("planning"));

  it("renders the status label as a badge", () => {
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("clicking enters edit mode", async () => {
    fireEvent.click(screen.getByText("Planning"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await flushPendingMacrotasks();
  });
});

describe("in edit mode", () => {
  it("selecting a new status commits it and returns to view mode", async () => {
    const onSave = mock();
    renderComponent("planning", onSave);
    fireEvent.click(screen.getByText("Planning"));
    fireEvent.click(screen.getByRole("option", { name: "In Progress" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("in_progress");
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    await flushPendingMacrotasks();
  });

  it("does not call onSave when the same status is selected", async () => {
    const onSave = mock();
    renderComponent("planning", onSave);
    fireEvent.click(screen.getByText("Planning"));
    fireEvent.click(screen.getByRole("option", { name: "Planning" }));
    expect(onSave).not.toHaveBeenCalled();
    await flushPendingMacrotasks();
  });
});
