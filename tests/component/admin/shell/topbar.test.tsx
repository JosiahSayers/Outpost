import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: { user: { name: string; email: string } } | null = null;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData }),
  },
}));

import Topbar from "$/frontend/admin/shell/topbar";

function renderTopbar() {
  return render(
    <MantineProvider>
      <Router hook={() => ["/console", () => {}]}>
        <Topbar />
      </Router>
    </MantineProvider>,
  );
}

describe("when there is an admin session", () => {
  it("shows the admin's name and email", () => {
    sessionData = {
      user: { name: "Josiah Sayers", email: "josiah.sayers@me.com" },
    };
    renderTopbar();

    expect(screen.getByText("Josiah Sayers")).toBeInTheDocument();
    expect(screen.getByText("josiah.sayers@me.com")).toBeInTheDocument();
  });

  it("shows an Admin badge", () => {
    sessionData = {
      user: { name: "Josiah Sayers", email: "josiah.sayers@me.com" },
    };
    renderTopbar();

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("links the logo back to the console overview", () => {
    sessionData = {
      user: { name: "Josiah Sayers", email: "josiah.sayers@me.com" },
    };
    renderTopbar();

    expect(screen.getByAltText("Outpost").closest("a")).toHaveAttribute(
      "href",
      "/console",
    );
  });

  it("links back to the main app dashboard", () => {
    sessionData = {
      user: { name: "Josiah Sayers", email: "josiah.sayers@me.com" },
    };
    renderTopbar();

    expect(screen.getByText("← Back to app").closest("a")).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
