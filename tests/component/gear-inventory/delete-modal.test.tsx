import DeleteModal from "$/frontend/gear-inventory/delete-modal";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";
import { make } from "../../helpers/test-data/make";

const onClose = mock(() => {});

const item = transformers.gearInventoryItem({
  ...make("GearInventoryItem", { name: "Big Agnes Copper Spur UL2" }),
  category: make("GearCategory"),
});

beforeEach(() => {
  onClose.mockReset();
  render(
    <MantineProvider>
      <DeleteModal opened={true} onClose={onClose} item={item} />
    </MantineProvider>,
  );
});

it("renders the Delete item? title", () => {
  expect(screen.getByText("Delete item?")).toBeInTheDocument();
});

it("renders the item name in the confirmation text", () => {
  expect(screen.getByText("Big Agnes Copper Spur UL2")).toBeInTheDocument();
});

it("renders Cancel and Delete buttons", () => {
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
});

it("calls onClose when Cancel is clicked", () => {
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("calls onClose when Delete is clicked", () => {
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
