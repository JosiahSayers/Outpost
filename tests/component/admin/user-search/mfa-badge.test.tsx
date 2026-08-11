import MfaBadge from "$/frontend/admin/user-search/mfa-badge";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

function renderBadge(enabled: boolean) {
  render(
    <MantineProvider>
      <MfaBadge user={{ mfa: { enabled, enrolledAt: null } }} />
    </MantineProvider>,
  );
}

it("shows an MFA badge for an enrolled user", () => {
  renderBadge(true);
  expect(screen.getByText("MFA")).toBeInTheDocument();
});

it("shows a No MFA badge for a user who hasn't enrolled", () => {
  renderBadge(false);
  expect(screen.getByText("No MFA")).toBeInTheDocument();
});
