import TripDates from "$/frontend/trip/header/trip-dates";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderComponent(
  start: string | null,
  end: string | null,
  onSave: (range: { start?: string | null; end?: string | null }) => void,
) {
  render(
    <MantineProvider>
      <TripDates start={start} end={end} onSave={onSave} />
    </MantineProvider>,
  );
}

describe("in view mode", () => {
  it("renders the formatted date range", () => {
    renderComponent("2026-07-05", "2026-07-20", mock());
    expect(screen.getByText("Jul 5 – Jul 20, 2026")).toBeInTheDocument();
  });

  it("renders 'Dates TBD' when neither date is set", () => {
    renderComponent(null, null, mock());
    expect(screen.getByText("Dates TBD")).toBeInTheDocument();
  });

  it("clicking enters edit mode with a start and end date input", () => {
    renderComponent("2026-07-05", "2026-07-20", mock());
    fireEvent.click(screen.getByText("Jul 5 – Jul 20, 2026"));
    expect(screen.getByPlaceholderText("Start date")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("End date")).toBeInTheDocument();
  });
});

describe("in edit mode", () => {
  function enterEditMode(
    start: string | null,
    end: string | null,
    onSave: (range: { start?: string | null; end?: string | null }) => void,
  ) {
    renderComponent(start, end, onSave);
    fireEvent.click(screen.getByText(formatted(start, end)));
  }

  function formatted(start: string | null, end: string | null) {
    return start && end ? "Jul 5 – Jul 20, 2026" : "Dates TBD";
  }

  it("shows inputs pre-filled with the current values", () => {
    enterEditMode("2026-07-05", "2026-07-20", mock());
    expect(screen.getByPlaceholderText("Start date")).toHaveValue(
      "July 5, 2026",
    );
    expect(screen.getByPlaceholderText("End date")).toHaveValue(
      "July 20, 2026",
    );
  });

  it("changing the start date calls onSave with only the start key", () => {
    const onSave = mock();
    enterEditMode("2026-07-05", "2026-07-20", onSave);
    fireEvent.change(screen.getByPlaceholderText("Start date"), {
      target: { value: "July 10, 2026" },
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toEqual({ start: "2026-07-10" });
  });

  it("changing the end date calls onSave with only the end key", () => {
    const onSave = mock();
    enterEditMode("2026-07-05", "2026-07-20", onSave);
    fireEvent.change(screen.getByPlaceholderText("End date"), {
      target: { value: "July 25, 2026" },
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toEqual({ end: "2026-07-25" });
  });

  it("pressing Escape returns to view mode", () => {
    enterEditMode("2026-07-05", "2026-07-20", mock());
    fireEvent.keyDown(screen.getByPlaceholderText("Start date"), {
      key: "Escape",
    });
    expect(screen.getByText("Jul 5 – Jul 20, 2026")).toBeInTheDocument();
  });

  it("applies a distinct style to the selected day in each calendar", async () => {
    enterEditMode("2026-07-05", "2026-07-20", mock());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "5 July 2026" })).toHaveStyle({
        fontWeight: "700",
      });
      expect(
        screen.getByRole("button", { name: "6 July 2026" }),
      ).not.toHaveStyle({ fontWeight: "700" });
    });
  });
});
