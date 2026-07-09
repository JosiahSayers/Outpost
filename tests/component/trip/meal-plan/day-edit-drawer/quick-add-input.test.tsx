import QuickAddInput from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";

const onAdd = mock((_name: string) => {});

function renderInput() {
  render(
    <MantineProvider>
      <QuickAddInput meal="dinner" onAdd={onAdd} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  onAdd.mockReset();
});

it("labels the input for the given meal", () => {
  renderInput();
  expect(
    screen.getByRole("textbox", { name: "Add to Dinner" }),
  ).toBeInTheDocument();
});

it("calls onAdd with the trimmed name on Enter and clears the input", () => {
  renderInput();
  const input = screen.getByRole("textbox", { name: "Add to Dinner" });

  fireEvent.change(input, { target: { value: "  Pad Thai  " } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(onAdd).toHaveBeenCalledWith("Pad Thai");
  expect(input).toHaveValue("");
});

it("does not call onAdd when the input is blank", () => {
  renderInput();
  const input = screen.getByRole("textbox", { name: "Add to Dinner" });

  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(onAdd).not.toHaveBeenCalled();
});
