import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";
import { SignOutProvider } from "$/frontend/utils/sign-out-context";

let sessionData: {
  user: { name: string; email: string; role?: string };
} | null = null;
let isPending = false;

const signOut = mock(() => {});

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData, isPending }),
    signOut,
  },
}));

import HeaderLinks from "$/frontend/layout/app-shell/header-links";

function headerLinksTree(navigate: () => void) {
  return (
    <MantineProvider>
      <SignOutProvider>
        <Router hook={() => ["/dashboard", navigate]}>
          <HeaderLinks stacked />
        </Router>
      </SignOutProvider>
    </MantineProvider>
  );
}

function renderHeaderLinks(navigate = mock(() => {})) {
  return render(headerLinksTree(navigate));
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

describe("when signing out", () => {
  it("waits for the session to actually clear before navigating to the sign-in page", () => {
    sessionData = {
      user: {
        name: "Josiah Sayers",
        email: "josiah.sayers@me.com",
        role: "user",
      },
    };
    const navigate = mock(() => {});
    const { rerender } = renderHeaderLinks(navigate);

    fireEvent.click(screen.getByText("Sign Out"));

    // signOut() was called, but better-auth's client cache hasn't caught up
    // yet — session.data still looks authenticated, so no navigation yet.
    expect(signOut).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    // The session store catches up.
    sessionData = null;
    rerender(headerLinksTree(navigate));

    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?reason=signed-out",
      undefined,
    );
  });

  it("does not navigate for an unrelated session change that isn't a sign-out", () => {
    sessionData = null;
    isPending = false;
    const navigate = mock(() => {});
    renderHeaderLinks(navigate);

    expect(navigate).not.toHaveBeenCalled();
  });
});
