import LogEntry from "$/frontend/admin/feedback-detail/log-entry";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

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

function makeLog(
  overrides: Partial<ClientAdminFeedbackAuditLog> = {},
): ClientAdminFeedbackAuditLog {
  return {
    id: "log-1",
    createdAt: new Date("2026-08-01T19:00:00Z"),
    changeDescription: "Status change: new -> triaged",
    admin: makeAdmin(),
    ...overrides,
  };
}

function renderLog(
  log: ClientAdminFeedbackAuditLog,
  onNoteHover: (noteId: string | null) => void = () => {},
) {
  render(
    <MantineProvider>
      <LogEntry log={log} onNoteHover={onNoteHover} />
    </MantineProvider>,
  );
}

describe("with an attributed admin", () => {
  it("shows the change description and the admin's name", () => {
    renderLog(makeLog());
    expect(
      screen.getByText(/Status change: new -> triaged/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Josiah Sayers/)).toBeInTheDocument();
  });
});

describe("when the admin no longer exists", () => {
  it("falls back to 'System' instead of a blank attribution", () => {
    renderLog(makeLog({ admin: null }));
    expect(screen.getByText(/System/)).toBeInTheDocument();
  });
});

describe("when changeDescription embeds a note id", () => {
  const noteId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("renders the id truncated instead of the full UUID", () => {
    renderLog(
      makeLog({ changeDescription: `Note (${noteId}) message updated` }),
    );

    expect(screen.getByText(/\(#a1b2c3d4\)/)).toBeInTheDocument();
    expect(
      screen.queryByText(noteId, { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("calls onNoteHover with the full note id on hover in, and null on hover out", () => {
    const onNoteHover = mock(() => {});
    renderLog(
      makeLog({ changeDescription: `Note (${noteId}) message updated` }),
      onNoteHover,
    );

    const idSpan = screen.getByText(/\(#a1b2c3d4\)/);
    fireEvent.mouseEnter(idSpan);
    expect(onNoteHover).toHaveBeenLastCalledWith(noteId);

    fireEvent.mouseLeave(idSpan);
    expect(onNoteHover).toHaveBeenLastCalledWith(null);
  });
});

describe("when changeDescription has no embedded note id", () => {
  it("renders the text unchanged and never calls onNoteHover", () => {
    const onNoteHover = mock(() => {});
    renderLog(
      makeLog({ changeDescription: "Status change: new -> triaged" }),
      onNoteHover,
    );

    expect(
      screen.getByText(/Status change: new -> triaged/),
    ).toBeInTheDocument();
    expect(onNoteHover).not.toHaveBeenCalled();
  });
});
