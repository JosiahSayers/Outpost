import LoadingSwitch from "$/frontend/shared-components/loading-switch";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import {
  useAdminDashboardStats,
  useAdminStatValues,
} from "$/frontend/utils/api/admin-dashboard";
import type { AdminStat, SupportedStat } from "$/utils/admin/stats";
import { Card, SimpleGrid, Skeleton, Text } from "@mantine/core";
import { useMemo } from "react";

const TREND_COLOR: Record<NonNullable<AdminStat["trend"]>, string> = {
  up: "trail-green.7",
  down: "trail-dust.7",
  constant: "dimmed",
};

// Matches the SimpleGrid's `sm` column count, so the loading state occupies
// the same footprint as the loaded strip.
const PLACEHOLDER_COUNT = 4;

function StatCard({
  data,
  isPending,
}: {
  data: { stat: AdminStat } | undefined;
  isPending: boolean;
}) {
  const { showSpinner } = useDelayedLoading(isPending);

  return (
    <Skeleton visible={showSpinner}>
      <Card withBorder padding="sm" shadow="xs">
        <Text
          size="10px"
          fw={700}
          tt="uppercase"
          c="dimmed"
          style={{ letterSpacing: "0.06em" }}
        >
          {data?.stat.label ?? " "}
        </Text>
        <Text fz={24} fw={700} mt={2} ff="var(--mantine-font-family-headings)">
          {data?.stat.value ?? " "}
        </Text>
        <Text
          size="xs"
          fw={600}
          c={data?.stat.trend ? TREND_COLOR[data.stat.trend] : "dimmed"}
        >
          {data?.stat.delta ?? " "}
        </Text>
      </Card>
    </Skeleton>
  );
}

export default function StatStrip() {
  const { data: statsList, isPending: isStatsListPending } =
    useAdminDashboardStats();

  const sortedStats = useMemo(() => {
    if (!statsList) return [];
    return Object.entries(statsList.statsWithSortPosition)
      .sort(([, a], [, b]) => a - b)
      .map(([stat]) => stat as SupportedStat);
  }, [statsList]);

  const statQueries = useAdminStatValues(sortedStats);

  return (
    <LoadingSwitch
      loading={isStatsListPending}
      fallback={
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
            <Skeleton key={index} visible>
              <Card withBorder padding="sm" shadow="xs" h={76} />
            </Skeleton>
          ))}
        </SimpleGrid>
      }
    >
      {() => (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {statQueries.map(({ data, isPending }, index) => (
            <StatCard
              key={sortedStats[index]}
              data={data}
              isPending={isPending}
            />
          ))}
        </SimpleGrid>
      )}
    </LoadingSwitch>
  );
}
