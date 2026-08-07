import StatusControl from "$/frontend/admin/feedback-detail/status-control";
import { adminFeedbackKeys } from "$/frontend/utils/api/admin-feedback";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

// respectReducedMotion + a matching matchMedia mock make the confirm Modal's
// Transition take the synchronous (duration=0) path instead of scheduling
// requestAnimationFrame — see tests/component/admin/user-sessions/index.test.tsx
// for the same pattern.
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

// Selecting an option inside the Select's Combobox popover, in the same
// synthetic event, sets state that opens a sibling Modal — that state
// change doesn't paint until pending microtasks flush. `await waitFor(() =>
// {})` right after the interaction (not between the two clicks) flushes it.
// See trip-status.test.tsx for the same pattern.
async function flushPendingMacrotasks() {
  await waitFor(() => {});
}

const FEEDBACK_ID = "feedback-1";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderControl(
  status: FeedbackStatus = "new",
  queryClient: QueryClient = makeQueryClient(),
) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <StatusControl feedbackId={FEEDBACK_ID} status={status} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

it("renders the current status as the select's value", () => {
  renderControl("planned");
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue(
    "Planned",
  );
});

describe("selecting a different status", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("opens a confirm modal instead of saving immediately", async () => {
    global.fetch = mock(() => {
      throw new Error("should not be called before confirming");
    }) as unknown as typeof fetch;

    renderControl("new");
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Triaged" }));
    await flushPendingMacrotasks();

    expect(screen.getByText("Update status?")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("New");
  });

  it("reverts the select and closes without saving on cancel", async () => {
    global.fetch = mock(() => {
      throw new Error("should not be called");
    }) as unknown as typeof fetch;

    renderControl("new");
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Triaged" }));
    await flushPendingMacrotasks();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByText("Update status?")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("New");
  });

  it("calls the update endpoint once confirmed", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: { id: FEEDBACK_ID, status: "new" },
    });
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe(`/admin/feedback/${FEEDBACK_ID}`);
      expect(options?.method).toBe("PATCH");
      expect(JSON.parse(options?.body as string)).toEqual({
        status: "triaged",
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({ feedback: { id: FEEDBACK_ID, status: "triaged" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as unknown as typeof fetch;

    renderControl("new", queryClient);
    fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
    fireEvent.click(screen.getByRole("option", { name: "Triaged" }));
    await flushPendingMacrotasks();
    fireEvent.click(screen.getByRole("button", { name: "Update status" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
