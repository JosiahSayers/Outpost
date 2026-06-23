import CategorySection from "$/frontend/gear-inventory/category-section";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";
import { make } from "../../helpers/test-data/make";

const onEdit = mock(() => {});
const onDelete = mock(() => {});
const formatWeight = mock(() => "450g");

const item1 = transformers.gearInventoryItem({
  ...make("GearInventoryItem", { name: "Tent", gearCategoryId: 1 }),
  category: make("GearCategory", { id: 1, name: "Shelter" }),
});
const item2 = transformers.gearInventoryItem({
  ...make("GearInventoryItem", { name: "Sleeping Bag", gearCategoryId: 1 }),
  category: make("GearCategory", { id: 1, name: "Shelter" }),
});

beforeEach(() => {
  onEdit.mockReset();
  onDelete.mockReset();
  formatWeight.mockReset();
  render(
    <MantineProvider>
      <CategorySection
        name="Shelter"
        items={[item1, item2]}
        onEdit={onEdit}
        onDelete={onDelete}
        formatWeight={formatWeight}
      />
    </MantineProvider>,
  );
});

it("renders the category name", () => {
  expect(screen.getByText("Shelter")).toBeInTheDocument();
});

it("renders the item count", () => {
  expect(screen.getByText("(2)")).toBeInTheDocument();
});

it("renders a row for each item", () => {
  expect(screen.getByText("Tent")).toBeInTheDocument();
  expect(screen.getByText("Sleeping Bag")).toBeInTheDocument();
});

it("calls formatWeight for each item", () => {
  expect(formatWeight).toHaveBeenCalledTimes(2);
});

it("calls onEdit with the correct item when the edit button is clicked", () => {
  const row = screen.getByText("Tent").closest("tr")!;
  const [editButton] = within(row).getAllByRole("button");
  fireEvent.click(editButton!);
  expect(onEdit).toHaveBeenCalledWith(item1);
});

it("calls onDelete with the correct item when the delete button is clicked", () => {
  const row = screen.getByText("Tent").closest("tr")!;
  const [, deleteButton] = within(row).getAllByRole("button");
  fireEvent.click(deleteButton!);
  expect(onDelete).toHaveBeenCalledWith(item1);
});
