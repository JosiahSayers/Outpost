import StatStrip from "$/frontend/admin/overview/stat-strip";
import { adminDashboardKeys } from "$/frontend/utils/api/admin-dashboard";
import type { AdminStat } from "$/utils/admin/stats";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "bun:test";

const STATS: AdminStat[] = [
  {
    stat: "total_users",
    label: "Total Users",
    value: "4,812",
    delta: "+38 this week",
    trend: "up",
    sort: 1,
  },
  {
    stat: "banned_users",
    label: "Banned Users",
    value: "6",
    delta: null,
    trend: null,
    sort: 2,
  },
  {
    stat: "active_sessions",
    label: "Active Sessions",
    value: "214",
    delta: "+12 today",
    trend: "up",
    sort: 3,
  },
  {
    stat: "failed_jobs",
    label: "Failed Jobs",
    value: "1",
    delta: "packing-list-export",
    trend: "down",
    sort: 4,
  },
];

beforeEach(() => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(adminDashboardKeys.stats, {
    statsWithSortPosition: Object.fromEntries(
      STATS.map((stat) => [stat.stat, stat.sort]),
    ),
  });
  for (const stat of STATS) {
    queryClient.setQueryData(adminDashboardKeys.stat(stat.stat), { stat });
  }

  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <StatStrip />
      </MantineProvider>
    </QueryClientProvider>,
  );
});

it("renders every stat's label, value, and delta", () => {
  for (const stat of STATS) {
    expect(screen.getByText(stat.label)).toBeInTheDocument();
    expect(screen.getByText(stat.value)).toBeInTheDocument();
    if (stat.delta) {
      expect(screen.getByText(stat.delta)).toBeInTheDocument();
    }
  }
});
