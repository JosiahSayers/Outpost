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
  // Mutates on POST so the subsequent invalidate-triggered refetch (a
  // separate query-cache commit from the mutation's own onSuccess) returns
  // the item too, matching how the real API behaves.
  function mockPackingListApi(serverList: ClientFullPackingList) {
    const jsonHeaders = { "Content-Type": "application/json" };
    global.fetch = mock((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/items")) {
        const body = JSON.parse(init.body as string);
        const newItem = {
          id: "item-1",
          name: body.name,
          optional: false,
          quantity: body.quantity,
          sortPosition: 1,
          trackGearAssignment: true,
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
  }

  function postCalls() {
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    return fetchMock.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit | undefined)?.method === "POST",
    );
  }

  async function openDrawer() {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add item" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    // Items are no longer edited in place; the drawer is where naming,
    // quantity, gear and delete all live.
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: /name/i }),
      ).toBeInTheDocument(),
    );
  }

  it("opens a local draft in the drawer, ready to be renamed", async () => {
    mockPackingListApi(JSON.parse(JSON.stringify(baseList)));

    await openDrawer();

    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue(
      "New item",
    );
    // Nothing is created until Save — opening the drawer must not hit the
    // items endpoint.
    expect(postCalls()).toHaveLength(0);
  });

  it("does not create anything when canceled", async () => {
    mockPackingListApi(JSON.parse(JSON.stringify(baseList)));

    await openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("New item")).not.toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it("creates the item on save", async () => {
    mockPackingListApi(JSON.parse(JSON.stringify(baseList)));

    await openDrawer();
    fireEvent.change(screen.getByRole("textbox", { name: /name/i }), {
      target: { value: "Headlamp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(postCalls()).toHaveLength(1));
    const [, init] = postCalls()[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Headlamp",
      quantity: 1,
    });
  });
});
