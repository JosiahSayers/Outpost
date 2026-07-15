import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

let sessionData: {
  user: { name: string; email: string; role?: string };
} | null = null;
let isPending = false;

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: sessionData, isPending }),
  },
}));

import AdminPage from "$/frontend/pages/admin.page";

function renderPage(navigate: (to: string) => void = () => {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/console", navigate]}>
          <AdminPage />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("while the session is pending", () => {
  it("shows a loader and not the admin shell", () => {
    sessionData = null;
    isPending = true;
    renderPage();

    expect(document.querySelector(".mantine-Loader-root")).toBeInTheDocument();
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });
});

describe("when there is no session", () => {
  it("shows a loader while redirecting to sign-in", () => {
    sessionData = null;
    isPending = false;
    const navigate = mock(() => {});
    renderPage(navigate);

    expect(document.querySelector(".mantine-Loader-root")).toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith(
      "/sign-in?redirect=%2Fconsole",
      undefined,
    );
  });
});

describe("when signed in as a non-admin user", () => {
  it("shows a loader while redirecting to the dashboard", () => {
    sessionData = {
      user: {
        name: "Josiah Sayers",
        email: "josiah.sayers@me.com",
        role: "user",
      },
    };
    isPending = false;
    const navigate = mock(() => {});
    renderPage(navigate);

    expect(document.querySelector(".mantine-Loader-root")).toBeInTheDocument();
    expect(navigate).toHaveBeenCalledWith("/dashboard", undefined);
  });
});

describe("when signed in as an admin user", () => {
  it("renders the admin shell and overview", () => {
    sessionData = {
      user: {
        name: "Josiah Sayers",
        email: "josiah.sayers@me.com",
        role: "admin",
      },
    };
    isPending = false;
    const navigate = mock(() => {});
    renderPage(navigate);

    expect(navigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Welcome back, Josiah. Here's the state of things."),
    ).toBeInTheDocument();
  });
});
