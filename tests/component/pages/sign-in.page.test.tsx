import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: null }),
    signIn: { email: mock(() => Promise.resolve({ error: null })) },
  },
}));

import SignInPage from "$/frontend/pages/sign-in.page";

function renderPage(search = "") {
  return render(
    <MantineProvider>
      <Router hook={() => ["/sign-in", () => {}]} searchHook={() => search}>
        <SignInPage />
      </Router>
    </MantineProvider>,
  );
}

describe("when redirected here after signing out", () => {
  it("shows a signed-out confirmation instead of the sign-in prompt", () => {
    renderPage("reason=signed-out");

    expect(screen.getByText("You've been signed out.")).toBeInTheDocument();
    expect(
      screen.queryByText("You need to sign in to access that page."),
    ).not.toBeInTheDocument();
  });
});

describe("when bounced here by the authenticated guard", () => {
  it("shows the sign-in prompt", () => {
    renderPage("redirect=%2Fdashboard");

    expect(
      screen.getByText("You need to sign in to access that page."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("You've been signed out."),
    ).not.toBeInTheDocument();
  });
});

describe("when there is no redirect or reason", () => {
  it("shows no alert", () => {
    renderPage();

    expect(
      screen.queryByText("You need to sign in to access that page."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("You've been signed out."),
    ).not.toBeInTheDocument();
  });
});
