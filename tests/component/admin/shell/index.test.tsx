import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it, mock } from "bun:test";
import { Router } from "wouter";

mock.module("$/frontend/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { name: "Josiah Sayers", email: "josiah.sayers@me.com" } },
    }),
  },
}));

import AdminShell from "$/frontend/admin/shell";

it("renders the topbar, sidebar nav, and children", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/console", () => {}]}>
          <AdminShell>
            <div>Overview content</div>
          </AdminShell>
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );

  expect(screen.getByText("Admin")).toBeInTheDocument();
  expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
  expect(screen.getByText("Overview content")).toBeInTheDocument();
});
