import TripActionsMenu from "$/frontend/trip/header/trip-actions-menu";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function renderComponent(onDelete = mock()) {
  render(
    <MantineProvider>
      <TripActionsMenu onDelete={onDelete} />
    </MantineProvider>,
  );
  return onDelete;
}

describe("the trip actions menu", () => {
  it("opens with a Delete trip option", async () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Trip actions" }));
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Delete trip" }),
      ).toBeInTheDocument(),
    );
  });

  it("calls onDelete when the Delete trip option is clicked", async () => {
    const onDelete = renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Trip actions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Delete trip" }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
