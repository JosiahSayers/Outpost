import Timeline from "$/frontend/admin/feedback-detail/timeline";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

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
    message: "Confirmed on staging.",
    userFacing: false,
    admin: makeUser({ id: "admin-1", name: "Josiah Sayers", role: "admin" }),
    ...overrides,
  };
}

function makeLog(
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
    inferredSubject: [],
    inferredTopic: [],
    status: "new",
    submittedOnPage: "/dashboard",
    text: "Feedback text.",
    user: makeUser(),
    notes: [],
    auditLogs: [],
    duplicates: [],
    ...overrides,
  };
}

function renderTimeline(feedback: ClientFullAdminFeedback) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Timeline feedback={feedback} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return container;
}

describe("with notes and audit logs", () => {
  it("renders both, plus a synthetic 'Feedback submitted' entry", () => {
    renderTimeline(
      makeFullFeedback({ notes: [makeNote()], auditLogs: [makeLog()] }),
    );

    expect(screen.getByText("Confirmed on staging.")).toBeInTheDocument();
    expect(
      screen.getByText(/Status change: new -> triaged/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Feedback submitted.*Priya Natarajan/),
    ).toBeInTheDocument();
  });

  it("interleaves notes and audit logs newest-first", () => {
    const container = renderTimeline(
      makeFullFeedback({
        notes: [
          makeNote({
            id: "note-newest",
            createdAt: new Date("2026-08-01T20:00:00Z"),
            message: "Newest note.",
          }),
          makeNote({
            id: "note-oldest",
            createdAt: new Date("2026-08-01T18:00:00Z"),
            message: "Oldest note.",
          }),
        ],
        auditLogs: [
          makeLog({
            id: "log-middle",
            createdAt: new Date("2026-08-01T19:00:00Z"),
            changeDescription: "Status change: middle entry",
          }),
        ],
      }),
    );

    const text = container.textContent ?? "";
    const newestIndex = text.indexOf("Newest note.");
    const middleIndex = text.indexOf("Status change: middle entry");
    const oldestIndex = text.indexOf("Oldest note.");
    const submittedIndex = text.indexOf("Feedback submitted");

    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(oldestIndex);
    // The synthetic "submitted" line always trails the real entries,
    // regardless of how notes/logs sort against each other.
    expect(oldestIndex).toBeLessThan(submittedIndex);
  });
});

describe("with no notes or audit logs", () => {
  it("still renders the synthetic 'Feedback submitted' entry", () => {
    renderTimeline(makeFullFeedback());
    expect(screen.getByText(/Feedback submitted/)).toBeInTheDocument();
  });
});
