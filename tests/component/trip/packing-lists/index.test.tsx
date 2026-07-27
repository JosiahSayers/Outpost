import PackingListSection from "$/frontend/trip/packing-lists";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
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

function makePackingList(
  overrides: Partial<ClientTripPackingList> = {},
): ClientTripPackingList {
  return {
    id: "tpl-1",
    tripId: "trip-1",
    packingListId: "list-1",
    name: "Wonderland Backpacking Kit",
    sections: [
      {
        id: "sec-shelter",
        name: "Shelter",
        sortPosition: 0,
        items: [
          {
            id: "item-tent",
            name: "Tent",
            optional: false,
            quantity: 1,
            sortPosition: 0,
            status: { packed: true, notNeeded: false },
          },
          {
            id: "item-stakes",
            name: "Stakes (8x)",
            optional: false,
            quantity: 1,
            sortPosition: 1,
            status: { packed: false, notNeeded: false },
          },
        ],
      },
      {
        id: "sec-clothing",
        name: "Clothing",
        sortPosition: 1,
        items: [
          {
            id: "item-rainjacket",
            name: "Rain jacket",
            optional: false,
            quantity: 1,
            sortPosition: 0,
            status: { packed: true, notNeeded: false },
          },
          {
            id: "item-gloves",
            name: "Gloves",
            optional: false,
            quantity: 1,
            sortPosition: 1,
            status: { packed: false, notNeeded: true },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function renderSection(
  packingList: ClientTripPackingList | null = makePackingList(),
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <PackingListSection tripId="trip-1" packingList={packingList} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// Mantine's Collapse keeps a section's items mounted but `inert`/hidden until
// it opens, so role-based item queries only resolve after expanding.
async function openSection(sectionName: string, exampleItemName: string) {
  fireEvent.click(screen.getByText(sectionName));
  await waitFor(() => screen.getByRole("checkbox", { name: exampleItemName }));
}

// The assign drawer is always mounted and fires a background packing-list
// search request regardless of `opened`, so the PATCH call isn't necessarily
// the first fetch call — find it by method instead.
async function waitForPatchCall(): Promise<[string, RequestInit]> {
  await waitFor(() => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const patchCall = fetchMock.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as RequestInit | undefined)?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
  });
  const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
  return fetchMock.mock.calls.find(
    (call: unknown[]) =>
      (call[1] as RequestInit | undefined)?.method === "PATCH",
  )! as [string, RequestInit];
}

function mockFetchOk(body: unknown = {}) {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
}

describe("rendering", () => {
  it("renders the section title", () => {
    renderSection();
    expect(
      screen.getByRole("heading", { name: "Packing List" }),
    ).toBeInTheDocument();
  });

  it("renders the overall packed percentage, excluding not-needed items", () => {
    renderSection();
    // packed: Tent, Rain jacket (2); total, excluding Gloves: Tent, Stakes, Rain jacket (3)
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders one row per section", () => {
    renderSection();
    expect(screen.getByText("Shelter")).toBeInTheDocument();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("renders the assign-a-packing-list action when no list is assigned", () => {
    renderSection(null);
    expect(
      screen.getByRole("button", { name: "Assign a packing list" }),
    ).toBeInTheDocument();
  });

  it("renders the remove action when a list is assigned", () => {
    renderSection();
    expect(
      screen.getByRole("button", { name: "Remove packing list assignment" }),
    ).toBeInTheDocument();
  });
});

describe("toggling an item's packed state", () => {
  it("PATCHes the item with the packing list id and new packed state", async () => {
    mockFetchOk({ item: {} });
    renderSection();

    await openSection("Shelter", "Stakes (8x)");
    fireEvent.click(screen.getByRole("checkbox", { name: "Stakes (8x)" }));

    const [url, init] = await waitForPatchCall();
    expect(url).toBe("/api/trips/trip-1/packing-list/list-1/item-stakes");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ packed: true });
  });
});

describe("marking an item as not needed", () => {
  it("PATCHes the item with notNeeded true", async () => {
    mockFetchOk({ item: {} });
    renderSection();

    await openSection("Shelter", "Stakes (8x)");
    fireEvent.click(
      document.querySelector(
        '[aria-label="Mark Stakes (8x) as not needed for this trip"]',
      )!,
    );

    const [url, init] = await waitForPatchCall();
    expect(url).toBe("/api/trips/trip-1/packing-list/list-1/item-stakes");
    expect(JSON.parse(init.body as string)).toEqual({ notNeeded: true });
  });
});

describe("including a previously excluded item", () => {
  it("PATCHes the item with notNeeded false", async () => {
    mockFetchOk({ item: {} });
    renderSection();

    await openSection("Clothing", "Rain jacket");
    fireEvent.click(screen.getByText("Not needed for this trip (1)"));
    await waitFor(() => screen.getByRole("button", { name: "Include" }));
    fireEvent.click(screen.getByRole("button", { name: "Include" }));

    const [url, init] = await waitForPatchCall();
    expect(url).toBe("/api/trips/trip-1/packing-list/list-1/item-gloves");
    expect(JSON.parse(init.body as string)).toEqual({ notNeeded: false });
  });
});

describe("assigning a packing list", () => {
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

      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as unknown as typeof fetch;
  }

  async function selectAndSubmit() {
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
  }

  it("opens the assign drawer when clicked", async () => {
    mockFetch();
    renderSection(null);

    fireEvent.click(
      screen.getByRole("button", { name: "Assign a packing list" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: /Packing list/i }),
      ).toBeInTheDocument(),
    );
  });

  it("calls the assign API with the selected packing list id", async () => {
    mockFetch();
    renderSection(null);
    await selectAndSubmit();

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const postCall = fetchMock.mock.calls.find(
        (call: unknown[]) =>
          (call[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
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

  it("closes the drawer after a successful assignment", async () => {
    mockFetch();
    renderSection(null);
    await selectAndSubmit();

    await waitFor(() =>
      expect(
        screen.queryByRole("textbox", { name: /Packing list/i }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("removing a packing list assignment", () => {
  it("shows a confirmation modal explaining the effect of removal", async () => {
    renderSection();

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

  it("calls the remove API with the packing list id on confirm", async () => {
    mockFetchOk();
    renderSection();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove packing list assignment" }),
    );
    await waitFor(() => screen.getByText("Remove packing list assignment?"));
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
  });
});
