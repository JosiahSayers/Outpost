import PackingListSection from "$/frontend/trip/packing-lists";
import {
  mergeCategories,
  packingCompletion,
  placeholderPackingLists,
} from "$/frontend/trip/placeholder-data";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

// Suppresses act() warnings from Mantine's Popover (used by the assign
// drawer's search combobox) — see new-packing-list-drawer.test.tsx for the
// full explanation of why this matchMedia mock plus `await waitFor(() => {})`
// after synchronous renders are both needed.
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

function renderSection() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <PackingListSection tripId="trip-1" />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function pct(packed: number, total: number) {
  return total === 0 ? 0 : Math.round((packed / total) * 100);
}

// Mantine's Collapse keeps a category's items mounted but `inert`/hidden
// until it opens, so role-based item queries only resolve after expanding.
async function openCategory(categoryName: string, exampleItemName: string) {
  fireEvent.click(screen.getByText(categoryName));
  await waitFor(() => screen.getByRole("checkbox", { name: exampleItemName }));
}

describe("rendering", () => {
  it("renders the section title", () => {
    renderSection();
    expect(
      screen.getByRole("heading", { name: "Packing Lists" }),
    ).toBeInTheDocument();
  });

  it("renders the overall packed percentage from the placeholder data", () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);
    expect(screen.getByText(`${pct(packed, total)}%`)).toBeInTheDocument();
  });

  it("renders one row per merged category", () => {
    renderSection();
    for (const category of mergeCategories(placeholderPackingLists)) {
      expect(screen.getByText(category.name)).toBeInTheDocument();
    }
  });

  it("renders the assign-a-packing-list action", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: "Assign a packing list" }),
    ).toBeInTheDocument();
  });
});

describe("packing an item", () => {
  it("increases the overall packed percentage", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Shelter", "Stakes (8x)");
    fireEvent.click(screen.getByRole("checkbox", { name: "Stakes (8x)" }));

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed + 1, total)}%`),
      ).toBeInTheDocument(),
    );
  });
});

describe("marking an item as not needed", () => {
  it("drops it from both sides of the packed fraction and its checkbox row", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Shelter", "Stakes (8x)");
    fireEvent.click(
      document.querySelector(
        '[aria-label="Mark Stakes (8x) as not needed for this trip"]',
      )!,
    );

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed, total - 1)}%`),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: "Stakes (8x)" }),
    ).not.toBeInTheDocument();
  });
});

describe("including a previously excluded item", () => {
  it("adds it back into the denominator", async () => {
    renderSection();
    const { packed, total } = packingCompletion(placeholderPackingLists);

    await openCategory("Clothing", "Rain jacket");
    fireEvent.click(screen.getByText("Not needed for this trip (1)"));
    await waitFor(() => screen.getByRole("button", { name: "Include" }));
    fireEvent.click(screen.getByRole("button", { name: "Include" }));

    await waitFor(() =>
      expect(
        screen.getByText(`${pct(packed, total + 1)}%`),
      ).toBeInTheDocument(),
    );
  });
});

describe("assigning and removing a packing list", () => {
  function mockFetch() {
    global.fetch = mock((url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(url);
      const method = init?.method ?? "GET";

      if (urlStr.startsWith("/api/packing-lists") && method === "GET") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              packingLists: [
                {
                  id: "list-1",
                  name: "Alpine Kit",
                  totalSections: 2,
                  totalItems: 5,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (urlStr === "/api/trips/trip-1/packing-list" && method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              tripPackingList: {
                id: "tpl-1",
                tripId: "trip-1",
                packingListId: "list-1",
                name: "Alpine Kit",
                sections: [],
              },
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          ),
        );
      }

      if (
        urlStr === "/api/trips/trip-1/packing-list/list-1" &&
        method === "DELETE"
      ) {
        return Promise.resolve(new Response(null, { status: 200 }));
      }

      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as unknown as typeof fetch;
  }

  async function assignAlpineKit() {
    fireEvent.click(
      screen.getByRole("button", { name: "Assign a packing list" }),
    );
    await waitFor(() => screen.getByRole("textbox", { name: /Packing list/i }));

    fireEvent.change(screen.getByRole("textbox", { name: /Packing list/i }), {
      target: { value: "Alpine" },
    });
    await waitFor(() => screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByRole("button", { name: "Assign list" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove packing list assignment" }),
      ).toBeInTheDocument(),
    );
  }

  it("opens the assign drawer when clicked", async () => {
    mockFetch();
    renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Assign a packing list" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: /Packing list/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renames the button to offer removal once a list is assigned", async () => {
    mockFetch();
    renderSection();
    await assignAlpineKit();
  });

  it("calls the assign API with the selected packing list id", async () => {
    mockFetch();
    renderSection();
    await assignAlpineKit();

    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const postCall = fetchMock.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as RequestInit | undefined)?.method === "POST",
    )! as [string, RequestInit];
    expect(postCall[0]).toBe("/api/trips/trip-1/packing-list");
    expect(JSON.parse(postCall[1].body as string)).toEqual({
      packingListId: "list-1",
    });
  });

  it("shows a confirmation modal explaining the effect of removal", async () => {
    mockFetch();
    renderSection();
    await assignAlpineKit();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove packing list assignment" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Remove packing list assignment?"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/all packing list item statuses/),
    ).toBeInTheDocument();
    expect(screen.getByText(/won.t be affected/)).toBeInTheDocument();
  });

  it("calls the remove API and reverts the button on confirm", async () => {
    mockFetch();
    renderSection();
    await assignAlpineKit();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove packing list assignment" }),
    );
    await waitFor(() => screen.getByText("Remove packing list assignment?"));

    (global.fetch as unknown as ReturnType<typeof mock>).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const deleteCall = fetchMock.mock.calls.find(
        (call: unknown[]) =>
          (call[1] as RequestInit | undefined)?.method === "DELETE",
      );
      expect(deleteCall).toBeDefined();
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const deleteCall = fetchMock.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as RequestInit | undefined)?.method === "DELETE",
    )! as [string, RequestInit];
    expect(deleteCall[0]).toBe("/api/trips/trip-1/packing-list/list-1");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Assign a packing list" }),
      ).toBeInTheDocument(),
    );
  });
});
