import TripStatusBadge from "$/frontend/trip/header/trip-status";
import type { TripStatus } from "$/frontend/dashboard/types";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

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

describe("in view mode", () => {
  beforeEach(() => renderComponent("planning"));

  it("renders the status label as a badge", () => {
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("clicking enters edit mode", () => {
    fireEvent.click(screen.getByText("Planning"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

describe("in edit mode", () => {
  it("selecting a new status commits it and returns to view mode", () => {
    const onSave = mock();
    renderComponent("planning", onSave);
    fireEvent.click(screen.getByText("Planning"));
    fireEvent.click(screen.getByRole("option", { name: "In Progress" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("in_progress");
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("does not call onSave when the same status is selected", () => {
    const onSave = mock();
    renderComponent("planning", onSave);
    fireEvent.click(screen.getByText("Planning"));
    fireEvent.click(screen.getByRole("option", { name: "Planning" }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
