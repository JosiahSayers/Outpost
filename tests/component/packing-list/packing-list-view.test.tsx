import PackingListView from "$/frontend/packing-list/packing-list-view";
import { usePackingList } from "$/frontend/utils/api/packing-list";
import type { ClientFullPackingList } from "$/transformers/packing-list";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

// PackingListView reads `list` from a prop rather than calling useQuery
// itself, so its wiring to the real query cache (as `PackingListPage` sets
// it up) can only be exercised by rendering both together.
const baseList: ClientFullPackingList = {
  id: "list-1",
  name: "Trip",
  public: false,
  sourceUrl: null,
  description: null,
  copiedFromPackingListId: null,
  editable: true,
  totalItems: 0,
  totalUniqueItems: 0,
  totalSections: 1,
  sections: [
    {
      id: "section-1",
      name: "Pack List",
      sortPosition: 1,
      items: [],
    },
  ],
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function Page() {
  const { data, isLoading } = usePackingList("list-1");
  if (isLoading || !data) return null;
  return <PackingListView editable={true} list={data} />;
}

function renderPage() {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <MantineProvider>
        <Router hook={() => ["/packing-lists/list-1", () => {}]}>
          <Page />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("adding an item", () => {
  it("mounts the new row in edit mode", async () => {
    const jsonHeaders = { "Content-Type": "application/json" };
    // Mutates on POST so the subsequent invalidate-triggered refetch (a
    // separate query-cache commit from the mutation's own onSuccess) returns
    // the item too, matching how the real API behaves.
    const serverList: ClientFullPackingList = JSON.parse(
      JSON.stringify(baseList),
    );
    global.fetch = mock((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/items")) {
        const newItem = {
          id: "item-1",
          name: "New item",
          optional: false,
          quantity: 1,
          sortPosition: 1,
          assignedGear: null,
        };
        serverList.sections[0]!.items.push(newItem);
        return Promise.resolve(
          new Response(JSON.stringify({ item: newItem }), {
            status: 201,
            headers: jsonHeaders,
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ packingList: serverList }), {
          status: 200,
          headers: jsonHeaders,
        }),
      );
    }) as unknown as typeof fetch;

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add item" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "Item name" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: "Item name" })).toHaveValue(
      "New item",
    );
  });
});
