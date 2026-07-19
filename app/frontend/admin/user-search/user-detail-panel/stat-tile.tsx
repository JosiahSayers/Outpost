import { Card, Text } from "@mantine/core";

interface Props {
  label: string;
  value: number;
}

export default function StatTile({ label, value }: Props) {
  return (
    <Card withBorder padding="sm" shadow="xs">
      <Text
        size="10px"
        fw={700}
        tt="uppercase"
        c="dimmed"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </Text>
      <Text fz={22} fw={700} mt={2} ff="var(--mantine-font-family-headings)">
        {value}
      </Text>
    </Card>
  );
}
