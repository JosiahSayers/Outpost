import SearchResults from "$/frontend/admin/user-search/search-results";
import type { ClientAdminUserWithCounts } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

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

function renderResults(
  results: ClientAdminUserWithCounts[],
  isWideLayout: boolean,
) {
  render(
    <MantineProvider>
      <SearchResults
        results={results}
        selectedUserId={null}
        onSelect={mock()}
        isWideLayout={isWideLayout}
      />
    </MantineProvider>,
  );
}

describe("wide layout", () => {
  it("shows an MFA badge for an enrolled user", () => {
    renderResults(
      [makeUser({ mfa: { enabled: true, enrolledAt: null } })],
      true,
    );
    // One "MFA" match is the column header, the other is the badge itself.
    expect(screen.getAllByText("MFA")).toHaveLength(2);
  });

  it("shows a No MFA badge for a user who hasn't enrolled", () => {
    renderResults(
      [makeUser({ mfa: { enabled: false, enrolledAt: null } })],
      true,
    );
    expect(screen.getByText("No MFA")).toBeInTheDocument();
  });
});

describe("narrow (mobile) layout", () => {
  it("shows an MFA badge for an enrolled user", () => {
    renderResults(
      [makeUser({ mfa: { enabled: true, enrolledAt: null } })],
      false,
    );
    expect(screen.getByText("MFA")).toBeInTheDocument();
  });

  it("shows a No MFA badge for a user who hasn't enrolled", () => {
    renderResults(
      [makeUser({ mfa: { enabled: false, enrolledAt: null } })],
      false,
    );
    expect(screen.getByText("No MFA")).toBeInTheDocument();
  });
});
