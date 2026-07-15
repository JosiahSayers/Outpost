import {
  MOCK_ADMIN_STATS,
  type AdminStat,
} from "$/frontend/admin/overview/mock-data";
import { Card, SimpleGrid, Text } from "@mantine/core";

const TREND_COLOR: Record<AdminStat["trend"], string> = {
  up: "trail-green.7",
  down: "trail-dust.7",
  flat: "dimmed",
};

export default function StatStrip() {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {MOCK_ADMIN_STATS.map((stat) => (
        <Card key={stat.label} withBorder padding="sm" shadow="xs">
          <Text
            size="10px"
            fw={700}
            tt="uppercase"
            c="dimmed"
            style={{ letterSpacing: "0.06em" }}
          >
            {stat.label}
          </Text>
          <Text
            fz={24}
            fw={700}
            mt={2}
            ff="var(--mantine-font-family-headings)"
          >
            {stat.value}
          </Text>
          <Text size="xs" fw={600} c={TREND_COLOR[stat.trend]}>
            {stat.delta}
          </Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}
