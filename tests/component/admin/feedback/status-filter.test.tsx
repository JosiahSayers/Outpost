import StatusFilter from "$/frontend/admin/feedback/status-filter";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

const ACTIONABLE_STATUSES: FeedbackStatus[] = [
  "new",
  "triaged",
  "planned",
  "in_progress",
];

function renderFilter(
  value: FeedbackStatus[] = ACTIONABLE_STATUSES,
  onChange: (value: FeedbackStatus[]) => void = () => {},
) {
  render(
    <MantineProvider>
      <StatusFilter value={value} onChange={onChange} />
    </MantineProvider>,
  );
}

describe("on render", () => {
  it("shows a chip for every status, actionable and terminal", () => {
    renderFilter();
    [
      "New",
      "Triaged",
      "Planned",
      "In progress",
      "Completed",
      "Declined",
      "Duplicate",
    ].forEach((label) => {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    });
  });

  it("checks only the chips in the current value", () => {
    renderFilter(["new", "completed"]);
    expect(screen.getByRole("checkbox", { name: "New" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Completed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Triaged" })).not.toBeChecked();
  });
});

describe("checking an unselected chip", () => {
  it("calls onChange with the status added", () => {
    const onChange = mock((_value: FeedbackStatus[]) => {});
    renderFilter(ACTIONABLE_STATUSES, onChange);

    fireEvent.click(screen.getByRole("checkbox", { name: "Completed" }));

    expect(onChange).toHaveBeenCalledWith([
      ...ACTIONABLE_STATUSES,
      "completed",
    ]);
  });
});

describe("unchecking a selected chip", () => {
  it("calls onChange with the status removed", () => {
    const onChange = mock((_value: FeedbackStatus[]) => {});
    renderFilter(ACTIONABLE_STATUSES, onChange);

    fireEvent.click(screen.getByRole("checkbox", { name: "New" }));

    expect(onChange).toHaveBeenCalledWith([
      "triaged",
      "planned",
      "in_progress",
    ]);
  });
});
