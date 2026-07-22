import SessionRowMenu from "$/frontend/admin/user-sessions/session-row-menu";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// respectReducedMotion + a matching matchMedia mock make the Modal's open/close
// Transition take the synchronous (duration=0) path instead of scheduling
// requestAnimationFrame (happy-dom implements it as setImmediate) — without
// this, waiting for the dialog to close after Cancel/Revoke hangs indefinitely.
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
const SESSION_ID = "session-1";

function renderMenu() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <SessionRowMenu userId={USER_ID} sessionId={SESSION_ID} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByLabelText("Session actions"));
}

describe("the session actions menu", () => {
  it("opens with a Revoke session option", async () => {
    renderMenu();
    openMenu();

    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "Revoke session" }),
      ).toBeInTheDocument(),
    );
  });

  it("opens a confirmation dialog instead of revoking immediately", async () => {
    renderMenu();
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem"));

    await waitFor(() =>
      expect(screen.getByText("Revoke session?")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/immediately signs the device out/),
    ).toBeInTheDocument();
  });
});

describe("canceling the confirmation", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("closes the dialog without calling the revoke endpoint", async () => {
    global.fetch = mock() as unknown as typeof fetch;
    renderMenu();
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem"));
    await waitFor(() => screen.getByText("Revoke session?"));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByText("Revoke session?")).not.toBeInTheDocument(),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("confirming the revoke", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the revoke endpoint for the given session and closes the dialog", async () => {
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe(`/admin/users/${USER_ID}/sessions/${SESSION_ID}`);
      expect(options?.method).toBe("DELETE");
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as unknown as typeof fetch;

    renderMenu();
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem"));
    await waitFor(() => screen.getByText("Revoke session?"));

    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText("Revoke session?")).not.toBeInTheDocument(),
    );
  });

  it("keeps the dialog open and surfaces an error when the request fails", async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: "Something went wrong" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;

    renderMenu();
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem"));
    await waitFor(() => screen.getByText("Revoke session?"));

    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Revoke session?")).toBeInTheDocument();
  });
});
