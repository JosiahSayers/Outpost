import UserSessions from "$/frontend/admin/user-sessions";
import { adminSessionKeys } from "$/frontend/utils/api/admin-sessions";
import type { ClientSession } from "$/transformers/admin/session";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// respectReducedMotion + a matching matchMedia mock make the revoke
// confirmation Modal's Transition take the synchronous (duration=0) path
// instead of scheduling requestAnimationFrame (happy-dom implements it as
// setImmediate) — without this, waiting on the dialog after confirming a
// revoke is flaky/slow. See session-row-menu.test.tsx for the same pattern.
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

const USER_ID = "user-1";
const CHROME_MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function makeSession(overrides: Partial<ClientSession> = {}): ClientSession {
  return {
    id: "session-1",
    createdAt: new Date("2026-07-01T12:00:00Z"),
    updatedAt: new Date("2026-07-02T09:30:00Z"),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    impersonatedBy: null,
    ipAddress: "73.24.118.6",
    userAgent: CHROME_MAC_UA,
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
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <UserSessions userId={USER_ID} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("on initial load", () => {
  it("defaults to the Active filter and shows active sessions", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession()],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);

    await waitFor(() => screen.getByText("Chrome on macOS"));
    expect(screen.getByText("73.24.118.6")).toBeInTheDocument();
  });
});

describe("when there are no matching sessions", () => {
  it("shows an empty state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [],
      total: 0,
      pageSize: 10,
    });
    renderPage(queryClient);

    await waitFor(() =>
      expect(screen.getByText("No active sessions")).toBeInTheDocument(),
    );
  });
});

describe("when the user doesn't exist", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows a not-found state instead of an empty sessions table", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 404 })),
    ) as unknown as typeof fetch;

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText("This account no longer exists"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("No active sessions")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", { name: "Active" }),
    ).not.toBeInTheDocument();
  });
});

describe("switching the status filter", () => {
  it("requests expired sessions when the Expired pill is selected", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession()],
      total: 1,
      pageSize: 10,
    });
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "expired", 0, 10), {
      sessions: [
        makeSession({
          id: "session-2",
          ipAddress: "10.0.0.5",
          expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        }),
      ],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);
    await waitFor(() => screen.getByText("73.24.118.6"));

    fireEvent.click(screen.getByRole("radio", { name: "Expired" }));

    await waitFor(() =>
      expect(screen.getByText("10.0.0.5")).toBeInTheDocument(),
    );
  });
});

describe("an impersonated session", () => {
  it("shows the Impersonated badge", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession({ impersonatedBy: "admin-user-id" })],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);

    await waitFor(() =>
      expect(screen.getByText("Impersonated")).toBeInTheDocument(),
    );
  });
});

describe("paginating through sessions", () => {
  it("requests the next page when a page control is clicked", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession({ id: "session-1", ipAddress: "73.24.118.6" })],
      total: 15,
      pageSize: 10,
    });
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 10, 10), {
      sessions: [makeSession({ id: "session-2", ipAddress: "10.0.0.5" })],
      total: 15,
      pageSize: 10,
    });
    renderPage(queryClient);
    await waitFor(() => screen.getByText("73.24.118.6"));

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() =>
      expect(screen.getByText("10.0.0.5")).toBeInTheDocument(),
    );
  });

  it("resets back to page 1 when the status filter changes", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession({ id: "session-1", ipAddress: "73.24.118.6" })],
      total: 15,
      pageSize: 10,
    });
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 10, 10), {
      sessions: [makeSession({ id: "session-2", ipAddress: "10.0.0.5" })],
      total: 15,
      pageSize: 10,
    });
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "expired", 0, 10), {
      sessions: [makeSession({ id: "session-3", ipAddress: "192.168.0.1" })],
      total: 1,
      pageSize: 10,
    });
    renderPage(queryClient);
    await waitFor(() => screen.getByText("73.24.118.6"));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => screen.getByText("10.0.0.5"));

    fireEvent.click(screen.getByRole("radio", { name: "Expired" }));

    await waitFor(() =>
      expect(screen.getByText("192.168.0.1")).toBeInTheDocument(),
    );
  });
});

describe("revoking a session", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the revoke endpoint and removes the session after confirming", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminSessionKeys.list(USER_ID, "active", 0, 10), {
      sessions: [makeSession()],
      total: 1,
      pageSize: 10,
    });

    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe(`/admin/users/${USER_ID}/sessions/session-1`);
      expect(options?.method).toBe("DELETE");
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as unknown as typeof fetch;

    renderPage(queryClient);
    await waitFor(() => screen.getByText("Chrome on macOS"));

    fireEvent.click(screen.getByLabelText("Session actions"));
    fireEvent.click(await screen.findByRole("menuitem"));
    fireEvent.click(
      await screen.findByRole("button", { name: "Revoke session" }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
