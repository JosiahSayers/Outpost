import FeedbackStatusBadge from "$/frontend/admin/feedback/status-badge";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

function renderBadge(status: FeedbackStatus) {
  render(
    <MantineProvider>
      <FeedbackStatusBadge status={status} />
    </MantineProvider>,
  );
}

it.each([
  ["new", "New", "filled"],
  ["triaged", "Triaged", "outline"],
  ["planned", "Planned", "filled"],
  ["in_progress", "In progress", "filled"],
  ["completed", "Completed", "outline"],
  ["declined", "Declined", "outline"],
  ["duplicate", "Duplicate", "dot"],
] as [FeedbackStatus, string, string][])(
  "renders %s as %p with the %p variant",
  (status, label, variant) => {
    renderBadge(status);
    const badge = screen.getByText(label).closest(".mantine-Badge-root");
    expect(badge).toHaveAttribute("data-variant", variant);
  },
);
