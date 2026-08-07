import MetaSidebar from "$/frontend/admin/feedback-detail/meta-sidebar";
import type {
  ClientAdminFeedback,
  ClientFullAdminFeedback,
} from "$/transformers/admin/feedback";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

function makeUser(): ClientAdminUser {
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
  };
}

function makeDuplicate(
  overrides: Partial<ClientAdminFeedback> = {},
): ClientAdminFeedback {
  return {
    id: "dup-1",
    referenceId: "D1D2D3",
    createdAt: new Date("2026-08-03T12:00:00Z"),
    duplicateId: "feedback-1",
    inferredSubject: [],
    inferredTopic: [],
    status: "duplicate",
    submittedOnPage: "/trips/wonderland/packing-list",
    text: "Same issue here.",
    ...overrides,
  };
}

function makeFeedback(
  overrides: Partial<ClientFullAdminFeedback> = {},
): ClientFullAdminFeedback {
  return {
    id: "feedback-1",
    referenceId: "A1B2C3",
    createdAt: new Date("2026-07-27T18:42:00Z"),
    duplicateId: null,
    inferredSubject: [],
    inferredTopic: [],
    status: "new",
    submittedOnPage: "/trips/big-sur-2026/packing-list",
    text: "Feedback text.",
    user: makeUser(),
    notes: [],
    auditLogs: [],
    duplicates: [],
    ...overrides,
  };
}

function renderSidebar(feedback: ClientFullAdminFeedback) {
  render(
    <MantineProvider>
      <Router hook={() => ["/console/feedback/feedback-1", () => {}]}>
        <MetaSidebar feedback={feedback} />
      </Router>
    </MantineProvider>,
  );
}

describe("submitter details", () => {
  it("shows the submitter's name, email, and initials", () => {
    renderSidebar(makeFeedback());
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByText("priya@fernridge.co")).toBeInTheDocument();
    expect(screen.getByText("PN")).toBeInTheDocument();
  });

  it("links to the submitter's admin user record", () => {
    renderSidebar(makeFeedback());
    const link = screen.getByRole("link", { name: /Priya Natarajan/ });
    expect(link).toHaveAttribute(
      "href",
      "/console/users?search=priya%40fernridge.co&user=user-1",
    );
  });

  it("shows the page the feedback was submitted from", () => {
    renderSidebar(makeFeedback());
    expect(
      screen.getByText("/trips/big-sur-2026/packing-list"),
    ).toBeInTheDocument();
  });
});

describe("with no linked duplicates", () => {
  it("shows no duplicates section", () => {
    renderSidebar(makeFeedback({ duplicates: [] }));
    expect(screen.queryByText(/Linked duplicates/)).not.toBeInTheDocument();
  });
});

describe("with linked duplicates", () => {
  it("shows a count and a link to each duplicate", () => {
    renderSidebar(
      makeFeedback({
        duplicates: [
          makeDuplicate({ id: "dup-1", text: "Same issue here." }),
          makeDuplicate({ id: "dup-2", text: "Me too, exact same bug." }),
        ],
      }),
    );

    expect(screen.getByText("Linked duplicates (2)")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Same issue here." });
    expect(link).toHaveAttribute("href", "/console/feedback/dup-1");
  });

  it("truncates duplicate text longer than 48 characters", () => {
    const longText =
      "This is a very long piece of duplicate feedback text that goes on";
    expect(longText.length).toBeGreaterThan(48);

    renderSidebar(
      makeFeedback({ duplicates: [makeDuplicate({ text: longText })] }),
    );

    expect(screen.getByText(`${longText.slice(0, 48)}…`)).toBeInTheDocument();
    expect(screen.queryByText(longText)).not.toBeInTheDocument();
  });

  it("shows short duplicate text in full, without an ellipsis", () => {
    renderSidebar(
      makeFeedback({ duplicates: [makeDuplicate({ text: "Short one." })] }),
    );
    expect(screen.getByText("Short one.")).toBeInTheDocument();
  });
});
