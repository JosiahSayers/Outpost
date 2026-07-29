import DeleteModal from "$/frontend/gear-inventory/delete-modal";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";
import { make } from "../../helpers/test-data/make";

const onClose = mock(() => {});

const item = transformers.gearInventoryItem({
  ...make("GearInventoryItem", { name: "Big Agnes Copper Spur UL2" }),
  category: make("GearCategory"),
});

function renderModal(fetchResponse: Response) {
  global.fetch = mock(() =>
    Promise.resolve(fetchResponse),
  ) as unknown as typeof fetch;
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <DeleteModal opened={true} onClose={onClose} item={item} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onClose.mockReset();
  renderModal(new Response(null, { status: 204 }));
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

it("calls onClose after successful delete", async () => {
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
});
