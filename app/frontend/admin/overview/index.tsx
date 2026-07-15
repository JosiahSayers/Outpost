import StatStrip from "$/frontend/admin/overview/stat-strip";
import ToolGrid from "$/frontend/admin/overview/tool-grid";
import { Stack, Text, Title } from "@mantine/core";

interface AdminOverviewProps {
  adminName: string;
}

export default function AdminOverview({ adminName }: AdminOverviewProps) {
  const firstName = adminName.split(" ")[0];

  return (
    <Stack gap="xl" py="lg" px={{ base: "md", sm: "xl" }}>
      <div>
        <Title order={2}>Overview</Title>
        <Text c="dimmed" size="sm">
          Welcome back{firstName ? `, ${firstName}` : ""}. Here&apos;s the state
          of things.
        </Text>
      </div>

      <StatStrip />

      <div>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
          mb="sm"
          style={{ letterSpacing: "0.06em" }}
        >
          Tools
        </Text>
        <ToolGrid />
      </div>
    </Stack>
  );
}
