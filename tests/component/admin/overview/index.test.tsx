import { adminDashboardKeys } from "$/frontend/utils/api/admin-dashboard";
import type { AdminStat } from "$/utils/admin/stats";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

import AdminOverview from "$/frontend/admin/overview";

const TOTAL_USERS_STAT: AdminStat = {
  stat: "total_users",
  label: "Total Users",
  value: "4,812",
  delta: "+38 this week",
  trend: "up",
  sort: 1,
};

function renderOverview(adminName: string) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(adminDashboardKeys.stats, {
    statsWithSortPosition: { [TOTAL_USERS_STAT.stat]: TOTAL_USERS_STAT.sort },
  });
  queryClient.setQueryData(adminDashboardKeys.stat(TOTAL_USERS_STAT.stat), {
    stat: TOTAL_USERS_STAT,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AdminOverview adminName={adminName} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

it("greets the admin by their first name", () => {
  renderOverview("Josiah Sayers");

  expect(
    screen.getByText("Welcome back, Josiah. Here's the state of things."),
  ).toBeInTheDocument();
});

describe("when adminName is blank", () => {
  it("still renders a generic welcome", () => {
    renderOverview("");

    expect(
      screen.getByText("Welcome back. Here's the state of things."),
    ).toBeInTheDocument();
  });
});

it("renders the stat strip and tool grid", () => {
  renderOverview("Josiah Sayers");

  expect(screen.getByText("Total Users")).toBeInTheDocument();
  expect(screen.getByText("Tools")).toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
});
