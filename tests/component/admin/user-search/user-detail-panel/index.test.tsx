import UserDetailPanel from "$/frontend/admin/user-search/user-detail-panel";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

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

function renderPanel(user: ClientAdminUser) {
  render(
    <MantineProvider>
      <UserDetailPanel user={user} />
    </MantineProvider>,
  );
}

describe("account header", () => {
  it("shows the user's name and email", () => {
    renderPanel(makeUser());
    expect(screen.getByText("Tomás Reyes")).toBeInTheDocument();
    expect(screen.getByText("tomas.reyes@outlook.com")).toBeInTheDocument();
  });

  it("shows when the account was joined", () => {
    renderPanel(makeUser({ createdAt: new Date("2023-01-08T00:00:00Z") }));
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
  });

  it("shows a Verified badge for a verified, unbanned user", () => {
    renderPanel(makeUser({ emailVerified: true, banned: false }));
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
});

describe("a banned user", () => {
  it("shows a Banned badge and the ban reason", () => {
    renderPanel(makeUser({ banned: true, banReason: "ToS violation — spam" }));
    expect(screen.getAllByText("Banned").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Banned: ToS violation — spam"),
    ).toBeInTheDocument();
  });

  it("shows a generic banned message when there is no ban reason", () => {
    renderPanel(makeUser({ banned: true, banReason: null }));
    expect(screen.getByText("This account is banned.")).toBeInTheDocument();
  });
});

describe("account stats", () => {
  it("shows trips, gear items, packing lists, and active sessions", () => {
    renderPanel(
      makeUser({
        counts: {
          trips: 14,
          gearInventoryItems: 112,
          packingLists: 21,
          activeSessions: 2,
        },
      }),
    );

    expect(screen.getByText("Trips")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Gear Items")).toBeInTheDocument();
    expect(screen.getByText("112")).toBeInTheDocument();
    expect(screen.getByText("Packing Lists")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("admin actions", () => {
  it("lists each action, with Manage sessions live and the rest coming soon", () => {
    renderPanel(makeUser());

    expect(screen.getByText("Impersonate user")).toBeInTheDocument();
    expect(screen.getByText("Reset password")).toBeInTheDocument();
    expect(screen.getByText("Manage sessions")).toBeInTheDocument();
    expect(screen.getByText("View audit log")).toBeInTheDocument();
    expect(screen.getAllByText("Soon").length).toBe(3);
  });
});
