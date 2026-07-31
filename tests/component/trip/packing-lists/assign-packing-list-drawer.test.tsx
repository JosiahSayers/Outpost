import AssignPackingListDrawer from "$/frontend/trip/packing-lists/assign-packing-list-drawer";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

// Two patterns suppress act() warnings from Mantine's Popover (used by
// Combobox), matching the approach in
// tests/component/dashboard/packing-lists/new-packing-list-drawer.test.tsx:
//
// 1. matchMedia mock + respectReducedMotion:true — makes Mantine's Transition
//    take the synchronous (duration=0) path instead of scheduling a
//    requestAnimationFrame that would fire outside act() context.
// 2. `await waitFor(() => {})` after synchronous renders.
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
const onAssigned = mock(() => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderDrawer(queryClient: QueryClient = makeQueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <AssignPackingListDrawer
          tripId="trip-1"
          opened={true}
          onClose={onClose}
          onAssigned={onAssigned}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  onClose.mockReset();
  onAssigned.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ packingLists: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("when opened", () => {
  beforeEach(async () => {
    renderDrawer();
    await waitFor(() => {});
  });

  it("renders the drawer title", () => {
    expect(screen.getByText("Assign a packing list")).toBeInTheDocument();
  });

  it("renders the packing list search field", () => {
    expect(
      screen.getByRole("textbox", { name: /Packing list/i }),
    ).toBeInTheDocument();
  });

  it("renders a Cancel button", () => {
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders a disabled Assign list button until a list is selected", () => {
    expect(screen.getByRole("button", { name: "Assign list" })).toBeDisabled();
  });

  it("prefetches the user's packing lists", () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("mineOnly=true");
  });
});

describe("when opened is false", () => {
  it("does not render drawer content", () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <AssignPackingListDrawer
            tripId="trip-1"
            opened={false}
            onClose={onClose}
            onAssigned={onAssigned}
          />
        </MantineProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Assign a packing list")).not.toBeInTheDocument();
  });

  // The drawer stays mounted (controlled via `opened`, not mount/unmount) so
  // its close transition can play, so the user's own packing lists must not
  // be fetched until it's actually opened — otherwise every trip page load
  // would fetch them on the off chance the user opens this drawer.
  it("does not prefetch the user's packing lists", async () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <AssignPackingListDrawer
            tripId="trip-1"
            opened={false}
            onClose={onClose}
            onAssigned={onAssigned}
          />
        </MantineProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {});
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("clicking Cancel", () => {
  it("calls onClose", async () => {
    renderDrawer();
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("searching for a packing list", () => {
  const searchResults = [
    { id: "list-1", name: "Alpine Kit", totalSections: 2, totalItems: 5 },
    { id: "list-2", name: "Desert Kit", totalSections: 1, totalItems: 3 },
  ];

  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ packingLists: searchResults }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;
  });

  it("shows matching lists in the dropdown after typing", async () => {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Kit" } });

    await waitFor(() => {
      expect(screen.getByText("Alpine Kit")).toBeInTheDocument();
      expect(screen.getByText("Desert Kit")).toBeInTheDocument();
    });
  });

  it("shows section/item counts for each result", async () => {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Kit" } });

    await waitFor(() => {
      expect(screen.getByText("2 sections · 5 items")).toBeInTheDocument();
      expect(screen.getByText("1 section · 3 items")).toBeInTheDocument();
    });
  });

  it("enables the Assign list button once a result is selected", async () => {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Kit" } });

    await waitFor(() => screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByText("Alpine Kit"));

    expect(searchInput).toHaveValue("Alpine Kit");
    expect(
      screen.getByRole("button", { name: "Assign list" }),
    ).not.toBeDisabled();
  });

  it("issues the search excluding public lists (mineOnly)", async () => {
    renderDrawer();
    fireEvent.change(screen.getByRole("textbox", { name: /Packing list/i }), {
      target: { value: "Kit" },
    });

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const call = fetchMock.mock.calls.find((c: unknown[]) =>
        String(c[0]).includes("query=Kit"),
      );
      expect(call).toBeDefined();
      expect(String(call![0])).toContain("mineOnly=true");
    });
  });
});

describe("successful assignment", () => {
  beforeEach(() => {
    global.fetch = mock((url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
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
    }) as unknown as typeof fetch;
  });

  async function selectAndSubmit() {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Alpine" } });
    await waitFor(() => screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByRole("button", { name: "Assign list" }));
  }

  it("posts to the trip's packing-list endpoint with the selected id", async () => {
    await selectAndSubmit();

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const postCall = fetchMock.mock.calls.find(
        (c: unknown[]) => (c[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const [url, init] = fetchMock.mock.calls.find(
      (c: unknown[]) => (c[1] as RequestInit | undefined)?.method === "POST",
    )! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-1/packing-list");
    expect(JSON.parse(init.body as string)).toEqual({
      packingListId: "list-1",
    });
  });

  it("calls onAssigned with the created assignment", async () => {
    await selectAndSubmit();

    await waitFor(() =>
      expect(onAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ packingListId: "list-1" }),
      ),
    );
  });

  it("closes the drawer", async () => {
    await selectAndSubmit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe("when assignment fails", () => {
  beforeEach(() => {
    global.fetch = mock((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          new Response(null, {
            status: 500,
            statusText: "Internal Server Error",
          }),
        );
      }
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
    }) as unknown as typeof fetch;
  });

  it("shows an error message", async () => {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Alpine" } });
    await waitFor(() => screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByRole("button", { name: "Assign list" }));

    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument(),
    );
  });

  it("does not close the drawer", async () => {
    renderDrawer();
    const searchInput = screen.getByRole("textbox", { name: /Packing list/i });
    fireEvent.change(searchInput, { target: { value: "Alpine" } });
    await waitFor(() => screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByText("Alpine Kit"));
    fireEvent.click(screen.getByRole("button", { name: "Assign list" }));

    await waitFor(() =>
      screen.getByText("Something went wrong. Please try again."),
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
