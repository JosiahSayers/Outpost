import { Group, RingProgress, Text } from "@mantine/core";

interface Props {
  packed: number;
  total: number;
  packingListName: string;
}

export default function ProgressOverview({
  packed,
  total,
  packingListName,
}: Props) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);

  return (
    <Group gap="lg" wrap="nowrap" align="center">
      <RingProgress
        size={72}
        thickness={7}
        roundCaps
        sections={[{ value: pct, color: "trail-green" }]}
        label={
          <Text ta="center" fw={700} size="sm">
            {pct}%
          </Text>
        }
      />
      <div>
        <Text
          size="xs"
          tt="uppercase"
          fw={700}
          c="dimmed"
          style={{ letterSpacing: "0.05em" }}
        >
          Packing Progress
        </Text>
        <Text fw={600}>
          {packed}/{total} packed
        </Text>
        <Text size="xs" c="dimmed">
          {packingListName}
        </Text>
      </div>
    </Group>
  );
}
