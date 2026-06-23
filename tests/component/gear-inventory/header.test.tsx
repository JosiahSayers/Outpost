import Header from "$/frontend/gear-inventory/header";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";

const onAdd = mock(() => {});

beforeEach(() => {
  onAdd.mockReset();
  render(
    <MantineProvider>
      <Header items={[]} onAdd={onAdd} />
    </MantineProvider>,
  );
});

it("renders the Gear Inventory heading", () => {
  expect(
    screen.getByRole("heading", { name: "Gear Inventory" }),
  ).toBeInTheDocument();
});

it("renders the subheading", () => {
  expect(
    screen.getByText("Track and manage everything in your kit."),
  ).toBeInTheDocument();
});

it("renders the Add Item button", () => {
  expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
});

it("calls onAdd when the Add Item button is clicked", () => {
  fireEvent.click(screen.getByRole("button", { name: /add item/i }));
  expect(onAdd).toHaveBeenCalledTimes(1);
});
