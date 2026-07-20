import UserSearch from "$/frontend/admin/user-search";
import { adminUserKeys } from "$/frontend/utils/api/admin-users";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const SEARCH_PLACEHOLDER = "Search by name or email…";

let isWide = false;
window.matchMedia = (query: string) =>
  ({
    matches: query === "(min-width: 48em)" ? isWide : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

function makeUser(overrides: Partial<ClientAdminUser> = {}): ClientAdminUser {
  return {
    id: "user-1",
    name: "Tomás Reyes",
    email: "tomas.reyes@outlook.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2023-01-08T00:00:00Z"),
    updatedAt: new Date("2023-01-08T00:00:00Z"),
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    counts: {
      trips: 14,
      gearInventoryItems: 112,
      packingLists: 21,
      activeSessions: 2,
    },
    ...overrides,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderPage(queryClient: QueryClient = makeQueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <UserSearch />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

async function search(term: string) {
  fireEvent.change(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), {
    target: { value: term },
  });
  await waitFor(() => {}, { timeout: 1000 });
}

beforeEach(() => {
  isWide = false;
});

describe("before a search is entered", () => {
  it("prompts the admin to search instead of showing results", () => {
    renderPage();

    expect(screen.getByText("Find an account")).toBeInTheDocument();
  });
});

describe("typing a search term", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requests the debounced term and renders the matching user", async () => {
    global.fetch = mock((url: string) => {
      expect(url).toContain("search=reyes");
      return Promise.resolve(
        new Response(
          JSON.stringify({ users: [makeUser()], total: 1, pageSize: 10 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as unknown as typeof fetch;

    renderPage();
    await search("reyes");

    await waitFor(() => screen.getByText("Tomás Reyes"));
    expect(screen.getByText("tomas.reyes@outlook.com")).toBeInTheDocument();
  });
});

describe("when no accounts match", () => {
  it("shows a no-matches message", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminUserKeys.search("zzqxlt"), {
      users: [],
      total: 0,
      pageSize: 10,
    });
    renderPage(queryClient);

    await search("zzqxlt");

    await waitFor(() =>
      expect(screen.getByText(/No accounts match/)).toBeInTheDocument(),
    );
  });
});

describe("on a narrow (mobile) layout", () => {
  function seedAndSearch() {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminUserKeys.search("reyes"), {
      users: [makeUser()],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);
    return search("reyes");
  }

  it("shows the results list but not the detail panel", async () => {
    await seedAndSearch();
    await waitFor(() => screen.getByText("Tomás Reyes"));

    expect(
      screen.queryByText("Select a user to view their account details."),
    ).not.toBeInTheDocument();
  });

  it("replaces the list with the detail panel when a result is selected", async () => {
    await seedAndSearch();
    await waitFor(() => screen.getByText("Tomás Reyes"));

    fireEvent.click(screen.getByText("Tomás Reyes"));

    await waitFor(() => screen.getByText("Back to results"));
    expect(screen.getByText("Trips")).toBeInTheDocument();
  });

  it("returns to the list when Back to results is clicked", async () => {
    await seedAndSearch();
    await waitFor(() => screen.getByText("Tomás Reyes"));
    fireEvent.click(screen.getByText("Tomás Reyes"));
    await waitFor(() => screen.getByText("Back to results"));

    fireEvent.click(screen.getByText("Back to results"));

    await waitFor(() =>
      expect(screen.queryByText("Back to results")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Tomás Reyes")).toBeInTheDocument();
  });
});

describe("on a wide (desktop) layout", () => {
  beforeEach(() => {
    isWide = true;
  });

  it("shows only the full-width list before anything is selected", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminUserKeys.search("reyes"), {
      users: [makeUser()],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);
    await search("reyes");

    await waitFor(() => screen.getByText("Tomás Reyes"));
    expect(screen.queryByText("Trips")).not.toBeInTheDocument();
  });

  it("shows the list alongside the detail panel once a result is selected, without a back link", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminUserKeys.search("reyes"), {
      users: [makeUser()],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);
    await search("reyes");
    await waitFor(() => screen.getByText("Tomás Reyes"));

    fireEvent.click(screen.getByText("Tomás Reyes"));

    await waitFor(() => screen.getByText("Trips"));
    expect(screen.queryByText("Back to results")).not.toBeInTheDocument();
  });
});
