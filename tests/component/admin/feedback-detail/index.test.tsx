import FeedbackDetail from "$/frontend/admin/feedback-detail";
import { adminFeedbackKeys } from "$/frontend/utils/api/admin-feedback";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Mantine's Textarea autosize hooks into font-loading events; happy-dom
// doesn't implement document.fonts, so stub it to avoid a crash in
// act-compat. See feedback-drawer.test.tsx for the same pattern.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

// respectReducedMotion + a matching matchMedia mock make the status-change
// confirm Modal's Transition take the synchronous (duration=0) path instead
// of scheduling requestAnimationFrame — see
// tests/component/admin/user-sessions/index.test.tsx for the same pattern.
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

const FEEDBACK_ID = "feedback-1";

function makeUser(overrides: Partial<ClientAdminUser> = {}): ClientAdminUser {
  return {
    id: "user-1",
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    email: "priya@fernridge.co",
    emailVerified: true,
    image: null,
    name: "Priya Natarajan",
    role: "user",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeNote(
  overrides: Partial<ClientAdminFeedbackNote> = {},
): ClientAdminFeedbackNote {
  return {
    id: "note-1",
    createdAt: new Date("2026-08-01T20:00:00Z"),
    message: "Confirmed on staging — filed BTP-142.",
    userFacing: false,
    admin: makeUser({ id: "admin-1", name: "Josiah Sayers", role: "admin" }),
    ...overrides,
  };
}

function makeAuditLog(
  overrides: Partial<ClientAdminFeedbackAuditLog> = {},
): ClientAdminFeedbackAuditLog {
  return {
    id: "log-1",
    createdAt: new Date("2026-08-01T19:00:00Z"),
    changeDescription: "Status change: new -> triaged",
    admin: makeUser({ id: "admin-1", name: "Josiah Sayers", role: "admin" }),
    ...overrides,
  };
}

function makeFullFeedback(
  overrides: Partial<ClientFullAdminFeedback> = {},
): ClientFullAdminFeedback {
  return {
    id: FEEDBACK_ID,
    referenceId: "A1B2C3",
    createdAt: new Date("2026-07-27T18:42:00Z"),
    duplicateId: null,
    inferredSubject: ["trip-duplication"],
    inferredTopic: ["packing-list"],
    status: "new",
    submittedOnPage: "/trips/big-sur-2026/packing-list",
    text: "Packing list quantities reset to zero every time I duplicate a trip.",
    user: makeUser(),
    notes: [makeNote()],
    auditLogs: [makeAuditLog()],
    duplicates: [],
    ...overrides,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

// useAdminFeedbackDetail always attempts a background refetch on mount
// (staleTime: 0, see admin-feedback.ts), so every test's fetch mock has to
// account for that extra GET, not just whatever request it's actually
// interested in. This installer handles it once: GET requests for this
// feedback's detail endpoint echo back whatever's already in the query
// cache (resolving quickly, like a real fetch, without changing what's on
// screen), and anything else — the endpoints individual tests care about —
// is delegated to an optional handler.
function installFetchMock(
  queryClient: QueryClient,
  handleOther?: (url: URL, init?: RequestInit) => Promise<Response> | undefined,
) {
  global.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");

    const isDetailGet =
      url.pathname === `/admin/feedback/${FEEDBACK_ID}` &&
      (!init?.method || init.method === "GET");
    if (isDetailGet) {
      const data = queryClient.getQueryData(
        adminFeedbackKeys.detail(FEEDBACK_ID),
      );
      if (data) {
        return Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
    }

    const handled = handleOther?.(url, init);
    if (handled) return handled;

    // Nothing seeded/handled for this request — hang rather than error, so
    // a test that didn't anticipate this request doesn't get a spurious
    // failure.
    return new Promise(() => {});
  }) as unknown as typeof fetch;
}

function renderDetail(
  queryClient: QueryClient = makeQueryClient(),
  handleOther?: (url: URL, init?: RequestInit) => Promise<Response> | undefined,
) {
  installFetchMock(queryClient, handleOther);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={{ respectReducedMotion: true }}>
        <FeedbackDetail feedbackId={FEEDBACK_ID} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("on initial load", () => {
  it("renders the feedback, submitter, tags, and timeline", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: makeFullFeedback(),
    });
    renderDetail(queryClient);

    await waitFor(() => screen.getByText(/Packing list quantities reset/));
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
    expect(
      screen.getByText("/trips/big-sur-2026/packing-list"),
    ).toBeInTheDocument();
    expect(screen.getByText("packing-list")).toBeInTheDocument();
    expect(
      screen.getByText("Confirmed on staging — filed BTP-142."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Status change: new -> triaged/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Feedback submitted/)).toBeInTheDocument();
  });

  it("lists linked duplicates when present", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: makeFullFeedback({
        duplicates: [
          {
            id: "dup-1",
            referenceId: "D1D2D3",
            createdAt: new Date("2026-08-03T12:00:00Z"),
            duplicateId: FEEDBACK_ID,
            inferredSubject: [],
            inferredTopic: [],
            status: "duplicate",
            submittedOnPage: "/trips/wonderland/packing-list",
            text: "Same issue here after duplicating a trip.",
          },
        ],
      }),
    });
    renderDetail(queryClient);

    await waitFor(() =>
      expect(screen.getByText("Linked duplicates (1)")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Same issue here after duplicating a trip."),
    ).toBeInTheDocument();
  });
});

describe("when the feedback doesn't exist", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows a not-found state", async () => {
    renderDetail(makeQueryClient(), () =>
      Promise.resolve(new Response(null, { status: 404 })),
    );

    await waitFor(() =>
      expect(
        screen.getByText("This feedback no longer exists"),
      ).toBeInTheDocument(),
    );
  });
});

describe("when the request fails", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows a generic error state", async () => {
    renderDetail(makeQueryClient(), () =>
      Promise.resolve(new Response(null, { status: 500 })),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't load this feedback"),
      ).toBeInTheDocument(),
    );
  });
});

describe("the status control", () => {
  // StatusControl's own interaction (confirm modal, cancel, calling the
  // update endpoint) is covered in status-control.test.tsx in isolation.
  // This just checks FeedbackDetail wires it up with the loaded feedback's
  // id and current status.
  it("shows the feedback's current status", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: makeFullFeedback({ status: "in_progress" }),
    });
    renderDetail(queryClient);

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue(
        "In progress",
      ),
    );
  });
});

describe("posting a note", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the notes endpoint and shows the new note", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: makeFullFeedback({ notes: [], auditLogs: [] }),
    });

    renderDetail(queryClient, (url, init) => {
      if (
        url.pathname !== `/admin/feedback/${FEEDBACK_ID}/notes` ||
        init?.method !== "POST"
      ) {
        return undefined;
      }
      expect(JSON.parse(init.body as string)).toEqual({
        message: "Reproduced locally too.",
        userFacing: true,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            note: makeNote({
              id: "note-2",
              message: "Reproduced locally too.",
              userFacing: true,
            }),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    await waitFor(() => screen.getByText(/Packing list quantities reset/));

    fireEvent.change(screen.getByPlaceholderText("Add a note…"), {
      target: { value: "Reproduced locally too." },
    });
    fireEvent.click(screen.getByLabelText("Visible to submitter"));
    fireEvent.click(screen.getByRole("button", { name: "Post note" }));

    await waitFor(() =>
      expect(screen.getByText("Reproduced locally too.")).toBeInTheDocument(),
    );
  });
});

describe("editing an existing note", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the note update endpoint with the edited message", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(adminFeedbackKeys.detail(FEEDBACK_ID), {
      feedback: makeFullFeedback(),
    });

    renderDetail(queryClient, (url, init) => {
      if (
        url.pathname !== `/admin/feedback/${FEEDBACK_ID}/notes/note-1` ||
        init?.method !== "PATCH"
      ) {
        return undefined;
      }
      expect(JSON.parse(init.body as string)).toEqual({
        message: "Confirmed on staging — filed BTP-142, now fixed.",
        userFacing: false,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            note: makeNote({
              message: "Confirmed on staging — filed BTP-142, now fixed.",
            }),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    });
    await waitFor(() => screen.getByText(/Packing list quantities reset/));

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const textarea = screen.getByDisplayValue(
      "Confirmed on staging — filed BTP-142.",
    );
    fireEvent.change(textarea, {
      target: {
        value: "Confirmed on staging — filed BTP-142, now fixed.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("Confirmed on staging — filed BTP-142, now fixed."),
      ).toBeInTheDocument(),
    );
  });
});
