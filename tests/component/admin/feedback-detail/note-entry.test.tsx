import NoteEntry from "$/frontend/admin/feedback-detail/note-entry";
import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Mantine's Textarea autosize (used in the inline edit form) hooks into
// font-loading events; happy-dom doesn't implement document.fonts, so stub
// it to avoid a crash. See feedback-drawer.test.tsx for the same pattern.
if (!document.fonts) {
  Object.defineProperty(document, "fonts", {
    value: { addEventListener: () => {}, removeEventListener: () => {} },
    configurable: true,
  });
}

const FEEDBACK_ID = "feedback-1";

function makeAdmin(overrides: Partial<ClientAdminUser> = {}): ClientAdminUser {
  return {
    id: "admin-1",
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    email: "josiah@outpost.dev",
    emailVerified: true,
    image: null,
    name: "Josiah Sayers",
    role: "admin",
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
    admin: makeAdmin(),
    ...overrides,
  };
}

function renderEntry(note: ClientAdminFeedbackNote = makeNote()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <NoteEntry feedbackId={FEEDBACK_ID} note={note} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("on render", () => {
  it("shows the admin's name, message, and an Internal badge for a non-user-facing note", () => {
    renderEntry();
    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
    expect(
      screen.getByText("Confirmed on staging — filed BTP-142."),
    ).toBeInTheDocument();
    expect(screen.getByText("Internal")).toBeInTheDocument();
  });

  it("shows a Visible to submitter badge for a user-facing note", () => {
    renderEntry(makeNote({ userFacing: true }));
    expect(screen.getByText("Visible to submitter")).toBeInTheDocument();
  });

  it("falls back to 'Deleted admin' when the note's admin no longer exists", () => {
    renderEntry(makeNote({ admin: null }));
    expect(screen.getByText("Deleted admin")).toBeInTheDocument();
  });
});

describe("clicking Edit", () => {
  it("shows an inline form pre-filled with the note's current message and visibility", () => {
    renderEntry(makeNote({ userFacing: true }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(
      screen.getByDisplayValue("Confirmed on staging — filed BTP-142."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Visible to submitter" }),
    ).toBeChecked();
  });
});

describe("cancelling an edit", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("discards changes and leaves the original message displayed", () => {
    global.fetch = mock(() => {
      throw new Error("should not be called");
    }) as unknown as typeof fetch;

    renderEntry();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(
      screen.getByDisplayValue("Confirmed on staging — filed BTP-142."),
      { target: { value: "something else entirely" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.getByText("Confirmed on staging — filed BTP-142."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });
});

describe("saving an edit", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls the update endpoint with the edited message and exits edit mode", async () => {
    global.fetch = mock((url: string, options?: RequestInit) => {
      expect(url).toBe(`/admin/feedback/${FEEDBACK_ID}/notes/note-1`);
      expect(options?.method).toBe("PATCH");
      expect(JSON.parse(options?.body as string)).toEqual({
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
    }) as unknown as typeof fetch;

    renderEntry();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(
      screen.getByDisplayValue("Confirmed on staging — filed BTP-142."),
      {
        target: {
          value: "Confirmed on staging — filed BTP-142, now fixed.",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("Confirmed on staging — filed BTP-142, now fixed."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });
});
