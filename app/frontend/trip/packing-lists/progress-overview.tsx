import { Group, RingProgress, Text } from "@mantine/core";

interface Props {
  packed: number;
  total: number;
  // Omitted when there's no assigned list to name (e.g. meal-plan items are
  // being tracked before a packing list has been assigned to the trip).
  packingListName?: string;
  // Meal-plan items track a second dimension gear doesn't (purchased), so
  // this renders as its own concentric ring rather than another slice of
  // the packed/total ring — the two percentages have different denominators
  // (purchasedTotal is meal-items-only) and can't be stacked as one whole.
  purchased?: number;
  purchasedTotal?: number;
}

export default function ProgressOverview({
  packed,
  total,
  packingListName,
  purchased,
  purchasedTotal,
}: Props) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  const hasPurchased = purchasedTotal !== undefined && purchasedTotal > 0;
  const purchasedPct = hasPurchased
    ? Math.round((purchased! / purchasedTotal!) * 100)
    : 0;

  return (
    <Group gap="lg" wrap="nowrap" align="center">
      <div style={{ position: "relative", width: 72, height: 72 }}>
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
        {hasPurchased && (
          <RingProgress
            size={50}
            thickness={6}
            roundCaps
            sections={[{ value: purchasedPct, color: "bark-brown" }]}
            style={{ position: "absolute", top: 11, left: 11 }}
          />
        )}
      </div>
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
        {hasPurchased && (
          <Text size="xs" c="bark-brown.7" fw={600}>
            {purchased}/{purchasedTotal} purchased
          </Text>
        )}
        {packingListName && (
          <Text size="xs" c="dimmed">
            {packingListName}
          </Text>
        )}
      </div>
    </Group>
  );
}
