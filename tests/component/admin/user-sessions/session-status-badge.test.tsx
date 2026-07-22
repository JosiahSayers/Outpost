import SessionStatusBadge from "$/frontend/admin/user-sessions/session-status-badge";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function renderBadge(expiresAt: Date | string) {
  render(
    <MantineProvider>
      <SessionStatusBadge expiresAt={expiresAt} />
    </MantineProvider>,
  );
}

describe("a session that expires in the future", () => {
  it("shows an Active badge", () => {
    renderBadge(new Date(Date.now() + 60 * 60 * 1000));

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Expired")).not.toBeInTheDocument();
  });
});

describe("a session that expired in the past", () => {
  it("shows an Expired badge", () => {
    renderBadge(new Date(Date.now() - 60 * 60 * 1000));

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });
});

describe("an expiresAt value passed as a string", () => {
  it("still evaluates the date correctly", () => {
    renderBadge(new Date(Date.now() - 60 * 60 * 1000).toISOString());

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});
