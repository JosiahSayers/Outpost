import PrintSummaryModal from "$/frontend/trip/header/print-summary-modal";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderComponent(onClose = mock()) {
  render(
    <MantineProvider>
      <PrintSummaryModal opened onClose={onClose} tripId="trip-1" />
    </MantineProvider>,
  );
  return onClose;
}

function exportLink(): HTMLAnchorElement {
  return screen.getByText("Export PDF").closest("a")!;
}

describe("PrintSummaryModal", () => {
  it("starts with every section checked and a carry-over Export PDF link", () => {
    renderComponent();

    expect(
      screen.getByRole("checkbox", { name: "Trip details" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tasks" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Meal plan" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Packing list" }),
    ).toBeChecked();

    const href = exportLink().getAttribute("href")!;
    expect(href).toContain("/api/trips/trip-1/summary-pdf?");
    expect(href).toContain("sections=details");
    expect(href).toContain("sections=tasks");
    expect(href).toContain("sections=mealPlan");
    expect(href).toContain("sections=packingList");
    expect(href).toContain("taskStatus=carryover");
    expect(href).toContain("packingListStatus=carryover");
  });

  it("only shows the carry-over/blank toggle for a section while it's checked", () => {
    renderComponent();

    // One toggle each for Tasks and Packing List, both defaulting to carryover.
    expect(
      screen.getAllByRole("radio", { name: "Carry over status" }),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: "Tasks" }));

    expect(
      screen.getAllByRole("radio", { name: "Carry over status" }),
    ).toHaveLength(1); // only the Packing List toggle remains
  });

  it("drops an unchecked section from the export URL", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("checkbox", { name: "Meal plan" }));

    const href = exportLink().getAttribute("href")!;
    expect(href).not.toContain("sections=mealPlan");
    expect(href).toContain("sections=details");
  });

  it("switches a section to blank when its toggle is set to Print blank", () => {
    renderComponent();

    const blankOptions = screen.getAllByRole("radio", {
      name: "Print blank",
    });
    // First is Tasks', second is Packing List's — flip Tasks'.
    fireEvent.click(blankOptions[0]!);

    const href = exportLink().getAttribute("href")!;
    expect(href).toContain("taskStatus=blank");
    expect(href).toContain("packingListStatus=carryover");
  });

  it("disables the export link once every section is unchecked", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("checkbox", { name: "Trip details" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tasks" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Meal plan" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Packing list" }));

    expect(exportLink()).not.toHaveAttribute("href");
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
