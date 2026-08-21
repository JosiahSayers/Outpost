import EditDrawer from "$/frontend/gear-inventory/edit-drawer";
import { gearCategoryKeys } from "$/frontend/utils/api/gear-categories";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { make } from "../../helpers/test-data/make";

// See new-packing-list-drawer.test.tsx for why matchMedia + respectReducedMotion
// are needed to keep Mantine's Popover (used by Combobox) synchronous in tests.
window.matchMedia = (query: string) =>
  ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

const onClose = mock(() => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderDrawer({
  item = null,
  queryClient,
}: {
  item?: Parameters<typeof EditDrawer>[0]["item"];
  queryClient?: QueryClient;
} = {}) {
  const client = queryClient ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <EditDrawer opened={true} onClose={onClose} item={item ?? null} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  onClose.mockReset();
  // Default: any unseeded fetch (e.g. the search/suggestions calls this
  // component fires) resolves to no results, so tests only need to seed the
  // query cache for the specific lookups they care about.
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ categories: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("suggestions on an empty category field", () => {
  it("shows a Suggested categories group after typing a matching item name and focusing Category", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(gearCategoryKeys.suggestions("Big Agnes Tent"), {
      categories: [{ id: "tents-id", name: "Tents", public: true }],
    });
    renderDrawer({ queryClient });

    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "Big Agnes Tent" },
    });
    fireEvent.focus(screen.getByRole("textbox", { name: "Category" }));

    await waitFor(() => {
      expect(screen.getByText("Suggested categories")).toBeInTheDocument();
      expect(screen.getByText("Tents")).toBeInTheDocument();
    });
  });

  it("fills the Category field when a suggestion is selected", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(gearCategoryKeys.suggestions("Big Agnes Tent"), {
      categories: [{ id: "tents-id", name: "Tents", public: true }],
    });
    renderDrawer({ queryClient });

    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "Big Agnes Tent" },
    });
    fireEvent.focus(screen.getByRole("textbox", { name: "Category" }));
    await waitFor(() => screen.getByText("Tents"));
    fireEvent.click(screen.getByText("Tents"));

    expect(screen.getByRole("textbox", { name: "Category" })).toHaveValue(
      "Tents",
    );
  });

  it("shows no dropdown when the item name matches nothing", async () => {
    renderDrawer();

    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "Unmatched Widget" },
    });
    fireEvent.focus(screen.getByRole("textbox", { name: "Category" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    expect(screen.queryByText("Suggested categories")).not.toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("typing into a non-empty category field", () => {
  it("uses search results instead of suggestions, without the Suggested group", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(gearCategoryKeys.search("Back"), {
      categories: [{ id: "backpacks-id", name: "Backpacks", public: true }],
    });
    renderDrawer({ queryClient });

    fireEvent.change(screen.getByRole("textbox", { name: "Category" }), {
      target: { value: "Back" },
    });

    await waitFor(() => {
      expect(screen.getByText("Backpacks")).toBeInTheDocument();
    });
    expect(screen.queryByText("Suggested categories")).not.toBeInTheDocument();
  });
});

describe("editing an existing item", () => {
  it("never requests suggestions, even after the item name changes", async () => {
    const category = make("GearCategory", { id: "cat-1", name: "Tents" });
    const item = transformers.gearInventoryItem({
      ...make("GearInventoryItem", { gearCategoryId: category.id }),
      category,
    });
    renderDrawer({ item });

    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "A totally different tent name" },
    });
    fireEvent.focus(screen.getByRole("textbox", { name: "Category" }));
    await waitFor(() => {});

    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const suggestionCalls = fetchMock.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes("/gear-categories/suggestions"),
    );
    expect(suggestionCalls).toHaveLength(0);
  });
});
