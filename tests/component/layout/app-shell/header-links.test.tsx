import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: {
  user: { name: string; email: string; role?: string };
} | null = null;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData }),
    signOut: mock(() => {}),
  },
}));

import HeaderLinks from "$/frontend/layout/app-shell/header-links";

function renderHeaderLinks() {
  return render(
    <MantineProvider>
      <Router hook={() => ["/dashboard", () => {}]}>
        <HeaderLinks stacked />
      </Router>
    </MantineProvider>,
  );
}

describe("when there is no session", () => {
  it("shows Sign In and Register links", () => {
    sessionData = null;
    renderHeaderLinks();

    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});

describe("when signed in as a non-admin user", () => {
  it("renders the account menu without an Admin link", () => {
    sessionData = {
      user: {
        name: "Josiah Sayers",
        email: "josiah.sayers@me.com",
        role: "user",
      },
    };
    renderHeaderLinks();

    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });
});

describe("when signed in as an admin user", () => {
  it("renders the account menu with an Admin link", () => {
    sessionData = {
      user: {
        name: "Josiah Sayers",
        email: "josiah.sayers@me.com",
        role: "admin",
      },
    };
    renderHeaderLinks();

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/console",
    );
  });
});
