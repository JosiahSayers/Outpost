import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import { Flex, Group, RingProgress, Stack, Text } from "@mantine/core";

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
  // Grams contributed by assigned gear (via the packing list) vs. by food
  // (via meal-plan items' dry weight), each split into packed vs. all
  // trackable items. Omitted (rather than 0) when that source has nothing
  // to report, so e.g. a trip with no meal plan doesn't claim food weighs
  // nothing rather than simply not applying.
  gearPackedGrams?: number;
  gearTotalGrams?: number;
  foodPackedGrams?: number;
  foodTotalGrams?: number;
}

export default function ProgressOverview({
  packed,
  total,
  packingListName,
  purchased,
  purchasedTotal,
  gearPackedGrams,
  gearTotalGrams,
  foodPackedGrams,
  foodTotalGrams,
}: Props) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
  const hasPurchased = purchasedTotal !== undefined && purchasedTotal > 0;
  const purchasedPct = hasPurchased
    ? Math.round((purchased! / purchasedTotal!) * 100)
    : 0;
  const formatWeight = useWeightDisplay();
  const hasGearWeight = gearTotalGrams !== undefined && gearTotalGrams > 0;
  const hasFoodWeight = foodTotalGrams !== undefined && foodTotalGrams > 0;
  const combinedTotalGrams = (gearTotalGrams ?? 0) + (foodTotalGrams ?? 0);
  const hasAnyWeight = hasGearWeight || hasFoodWeight;

  return (
    <Flex
      direction={{ base: "column", xs: "row" }}
      justify="space-between"
      align={{ base: "stretch", xs: "flex-start" }}
      gap={{ base: "sm", xs: "xl" }}
    >
      <Group gap="lg" wrap="nowrap" align="center">
        <div style={{ position: "relative", width: 96, height: 96 }}>
          <RingProgress
            size={96}
            thickness={9}
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
              size={66}
              thickness={8}
              roundCaps
              sections={[{ value: purchasedPct, color: "bark-brown" }]}
              style={{ position: "absolute", top: 15, left: 15 }}
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

      {hasAnyWeight && (
        <Stack gap={2} miw={160}>
          <Text
            size="xs"
            tt="uppercase"
            fw={700}
            c="dimmed"
            style={{ letterSpacing: "0.05em" }}
          >
            Weight
          </Text>
          {hasGearWeight && (
            <Text size="xs" c="dimmed">
              Gear: {formatWeight(gearPackedGrams ?? 0)} packed ·{" "}
              {formatWeight((gearTotalGrams ?? 0) - (gearPackedGrams ?? 0))}{" "}
              unpacked
            </Text>
          )}
          {hasFoodWeight && (
            <Text size="xs" c="dimmed">
              Food: {formatWeight(foodPackedGrams ?? 0)} packed ·{" "}
              {formatWeight((foodTotalGrams ?? 0) - (foodPackedGrams ?? 0))}{" "}
              unpacked
            </Text>
          )}
          <Text size="sm" fw={600}>
            Total: {formatWeight(combinedTotalGrams)}
          </Text>
        </Stack>
      )}
    </Flex>
  );
}
