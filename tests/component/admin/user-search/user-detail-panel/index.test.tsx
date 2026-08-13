import UserDetailPanel from "$/frontend/admin/user-search/user-detail-panel";
import type { ClientAdminUserWithCounts } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mockHealthFetch } from "../../../../helpers/mock-health-fetch";

let restoreFetch: () => void;

beforeEach(() => {
  restoreFetch = mockHealthFetch();
});

afterEach(() => {
  restoreFetch();
});

function makeUser(
  overrides: Partial<ClientAdminUserWithCounts> = {},
): ClientAdminUserWithCounts {
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
    mfa: {
      enabled: false,
      enrolledAt: null,
    },
    ...overrides,
  };
}

function renderPanel(user: ClientAdminUserWithCounts) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <UserDetailPanel user={user} />
      </MantineProvider>
    </QueryClientProvider>,
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

describe("mfa status", () => {
  it("shows an MFA badge and the enrollment date for an enrolled user", () => {
    renderPanel(
      makeUser({
        mfa: {
          enabled: true,
          enrolledAt: new Date("2023-02-14T00:00:00Z"),
        },
      }),
    );

    expect(screen.getByText("MFA")).toBeInTheDocument();
    expect(screen.getByText(/MFA enrolled/)).toBeInTheDocument();
  });

  it("shows a No MFA badge and no enrollment date for a user who hasn't enrolled", () => {
    renderPanel(makeUser({ mfa: { enabled: false, enrolledAt: null } }));

    expect(screen.getByText("No MFA")).toBeInTheDocument();
    expect(screen.queryByText(/MFA enrolled/)).not.toBeInTheDocument();
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
