import FeedbackCard from "$/frontend/admin/feedback-detail/feedback-card";
import type { ClientFullAdminFeedback } from "$/transformers/admin/feedback";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

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
    submittedOnPage: "/dashboard",
    text: "Packing list quantities reset to zero every time I duplicate a trip.",
    user: makeUser(),
    notes: [],
    auditLogs: [],
    duplicates: [],
    ...overrides,
  };
}

function renderCard(feedback: ClientFullAdminFeedback) {
  render(
    <MantineProvider>
      <FeedbackCard feedback={feedback} />
    </MantineProvider>,
  );
}

describe("the feedback text", () => {
  it("is shown quoted", () => {
    renderCard(makeFeedback());
    expect(
      screen.getByText(
        /Packing list quantities reset to zero every time I duplicate a trip\./,
      ),
    ).toBeInTheDocument();
  });
});

describe("with inferred topics and subjects", () => {
  it("shows a badge for each tag", () => {
    renderCard(
      makeFeedback({
        inferredTopic: ["packing-list"],
        inferredSubject: ["trip-duplication"],
      }),
    );
    expect(screen.getByText("packing-list")).toBeInTheDocument();
    expect(screen.getByText("trip-duplication")).toBeInTheDocument();
  });
});

describe("with no inferred topics or subjects", () => {
  it("renders no tag badges", () => {
    renderCard(makeFeedback({ inferredTopic: [], inferredSubject: [] }));
    expect(screen.queryByText("packing-list")).not.toBeInTheDocument();
  });
});
