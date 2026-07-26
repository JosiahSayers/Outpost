import NewPackingListDrawer from "$/frontend/dashboard/packing-lists/new-packing-list-drawer";
import { packingListKeys } from "$/frontend/utils/api/packing-list";
import type { ClientPackingList } from "$/transformers/packing-list";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

// Two patterns suppress act() warnings from Mantine's Popover (used by Combobox):
//
// 1. matchMedia mock + respectReducedMotion:true — makes Mantine's Transition take
//    the synchronous (duration=0) path instead of scheduling requestAnimationFrame
//    (setImmediate in happy-dom), which would fire outside act() context.
//
// 2. `await waitFor(() => {})` after synchronous renders — Testing Library's
//    asyncWrapper temporarily sets IS_REACT_ACT_ENVIRONMENT=false while flushing
//    pending macrotasks, so any remaining async callbacks from useFocusTrap /
//    floating-ui don't produce act() warnings.
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
const navigate = mock((_path: string, _opts?: unknown) => {});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderDrawer({
  useNavigateMock = false,
  queryClient,
}: { useNavigateMock?: boolean; queryClient?: QueryClient } = {}) {
  const client = queryClient ?? makeQueryClient();
  render(
    <QueryClientProvider client={client}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <Router
          hook={() => [
            "/dashboard",
            useNavigateMock ? (navigate as any) : () => {},
          ]}
        >
          <NewPackingListDrawer opened={true} onClose={onClose} />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  onClose.mockReset();
  navigate.mockReset();
});

describe("when opened", () => {
  beforeEach(async () => {
    renderDrawer();
    await waitFor(() => {});
  });

  it("renders the drawer title", () => {
    expect(screen.getByText("New packing list")).toBeInTheDocument();
  });

  it("renders the List name input", () => {
    expect(
      screen.getByRole("textbox", { name: "List name" }),
    ).toBeInTheDocument();
  });

  it("renders the Copy from existing list input", () => {
    expect(
      screen.getByLabelText("Copy from existing list"),
    ).toBeInTheDocument();
  });

  it("renders a Cancel button", () => {
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders a Create list button", () => {
    expect(
      screen.getByRole("button", { name: "Create list" }),
    ).toBeInTheDocument();
  });
});

describe("when opened is false", () => {
  it("does not render drawer content", () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MantineProvider theme={{ respectReducedMotion: true }}>
          <Router hook={() => ["/dashboard", () => {}]}>
            <NewPackingListDrawer opened={false} onClose={onClose} />
          </Router>
        </MantineProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText("New packing list")).not.toBeInTheDocument();
  });
});

describe("clicking Cancel", () => {
  beforeEach(async () => {
    renderDrawer();
    await waitFor(() => {});
  });

  it("calls onClose", () => {
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("form validation", () => {
  beforeEach(async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    ) as unknown as typeof fetch;
    renderDrawer();
    // Prepopulating the combobox fires a search request on mount; wait for it
    // and clear it so fetch-call assertions below only reflect actions taken
    // in each test.
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    (global.fetch as unknown as ReturnType<typeof mock>).mockClear();
  });

  it("shows an error when name is empty and form is submitted", async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "List name" })).toBeInvalid(),
    );
  });

  it("does not call the API when name is empty", () => {
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows an error when name is fewer than 3 characters", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "AB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "List name" })).toBeInvalid(),
    );
  });

  it("does not call the API when name is fewer than 3 characters", () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "AB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("successful submission", () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ packingList: { id: "42", name: "Weekend Kit" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;
  });

  it("calls the API with the list name", async () => {
    renderDrawer();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    (global.fetch as unknown as ReturnType<typeof mock>).mockClear();
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    // A successful create invalidates all "packing-lists"-prefixed queries,
    // including the prepopulated search, so a second (GET) call can follow
    // the POST — find the POST explicitly rather than assuming call order.
    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const postCall = fetchMock.mock.calls.find(
        (call: unknown[]) =>
          (call[1] as RequestInit | undefined)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
    const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
    const [, init] = fetchMock.mock.calls.find(
      (call: unknown[]) =>
        (call[1] as RequestInit | undefined)?.method === "POST",
    )! as [unknown, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Weekend Kit",
    });
  });

  it("navigates to the new packing list", async () => {
    renderDrawer({ useNavigateMock: true });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(navigate.mock.calls[0]?.[0]).toBe("/packing-lists/42"),
    );
  });
});

describe("when creation fails", () => {
  beforeEach(async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(null, {
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    ) as unknown as typeof fetch;
    renderDrawer({ useNavigateMock: true });
    await waitFor(() => {});
  });

  it("shows the error message", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument(),
    );
  });

  it("does not navigate", async () => {
    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Weekend Kit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create list" }));
    await waitFor(() =>
      screen.getByText("Something went wrong. Please try again."),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("copy from existing list search", () => {
  const searchResults: Partial<ClientPackingList>[] = [
    {
      id: "1",
      name: "Weekend Kit",
      totalSections: 2,
      totalItems: 6,
      description: "A light setup for a two night trip.",
    },
    { id: "2", name: "Weekend Warrior", totalSections: 1, totalItems: 3 },
  ];

  function renderWithSearchData(query: string) {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(packingListKeys.search(query), searchResults);
    renderDrawer({ queryClient });
    return queryClient;
  }

  beforeEach(() => {
    // The combobox prepopulates on mount with an empty-query search; give it
    // a harmless response so tests aren't tripped up by a real network call.
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ packingLists: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;
  });

  it("shows matching lists in the dropdown after typing", async () => {
    renderWithSearchData("Week");

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => {
      expect(screen.getByText("Weekend Kit")).toBeInTheDocument();
      expect(screen.getByText("Weekend Warrior")).toBeInTheDocument();
    });
  });

  it("shows section/item counts and description for each result", async () => {
    renderWithSearchData("Week");

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => {
      expect(screen.getByText("2 sections · 6 items")).toBeInTheDocument();
      expect(
        screen.getByText("A light setup for a two night trip."),
      ).toBeInTheDocument();
      expect(screen.getByText("1 section · 3 items")).toBeInTheDocument();
    });
  });

  it("populates the input when a result is selected", async () => {
    renderWithSearchData("Week");

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => screen.getByText("Weekend Kit"));
    fireEvent.click(screen.getByText("Weekend Kit"));

    expect(searchInput).toHaveValue("Weekend Kit");
  });

  it("includes copiedFromPackingListId in the API call when a source is selected", async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ packingList: { id: "99", name: "Emergency Bag" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as unknown as typeof fetch;

    renderWithSearchData("Week");
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    (global.fetch as unknown as ReturnType<typeof mock>).mockClear();

    fireEvent.change(screen.getByRole("textbox", { name: "List name" }), {
      target: { value: "Emergency Bag" },
    });

    const searchInput = screen.getByLabelText("Copy from existing list");
    fireEvent.change(searchInput, { target: { value: "Week" } });

    await waitFor(() => screen.getByText("Weekend Kit"));
    fireEvent.click(screen.getByText("Weekend Kit"));

    fireEvent.click(screen.getByRole("button", { name: "Create list" }));

    await waitFor(() => {
      const fetchMock = global.fetch as unknown as ReturnType<typeof mock>;
      const [, init] = fetchMock.mock.calls[0]!;
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ copiedFromPackingListId: "1" });
    });
  });
});
