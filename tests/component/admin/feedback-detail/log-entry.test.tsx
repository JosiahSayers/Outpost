import LogEntry from "$/frontend/admin/feedback-detail/log-entry";
import type { ClientAdminFeedbackAuditLog } from "$/transformers/admin/feedback-audit-log";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

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

function renderLog(log: ClientAdminFeedbackAuditLog) {
  render(
    <MantineProvider>
      <LogEntry log={log} />
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
