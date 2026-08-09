import SearchCombobox from "$/frontend/shared-components/search-combobox";
import { MEAL_LABEL } from "$/frontend/trip/meal-plan/helpers";
import {
  mealPlanItemSearchKeys,
  useMealPlanItemSearch,
} from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanItemSummary } from "$/transformers/meal-plan/item-summary";
import type { ClientPublicMealItemSummary } from "$/transformers/meal-plan/public-item-summary";
import { Badge, Group, Image, SimpleGrid, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { BowlFoodIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { MealName } from "../../../../../../generated/prisma/enums";
import SearchSkeleton from "./skeleton";
import StatCell from "./stat-cell";

interface Props {
  meal: MealName;
  tripId: string;
  onAdd: (name: string) => void;
  onSelectExisting: (item: ClientMealPlanItemSummary) => void;
  onSelectPublic: (item: ClientPublicMealItemSummary) => void;
}

export default function QuickAddInput({
  meal,
  tripId,
  onAdd,
  onSelectExisting,
  onSelectPublic,
}: Props) {
  const [name, setName] = useState("");
  const [debouncedName] = useDebouncedValue(name, 200);
  const search = useMealPlanItemSearch(tripId, debouncedName, meal);
  const results = search.data ?? [];

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  }

  return (
    <SearchCombobox
      size="xs"
      value={name}
      aria-label={`Add to ${MEAL_LABEL[meal]}`}
      placeholder={`Add to ${MEAL_LABEL[meal].toLowerCase()}…`}
      leftSection={<PlusIcon size={12} />}
      onValueChange={setName}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit();
      }}
      results={results}
      isFetching={search.isFetching}
      searchKeyPrefix={mealPlanItemSearchKeys.all}
      getOptionValue={(item) => item.id}
      onOptionSubmit={(item) => {
        if (item.source === "public") {
          onSelectPublic(item);
        } else {
          onSelectExisting(item);
        }
        setName("");
      }}
      icon={<BowlFoodIcon size={16} color="var(--mantine-color-dimmed)" />}
      renderOption={(item) => (
        <Stack gap={6}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              {item.source === "public" && item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt=""
                  w={20}
                  h={20}
                  radius="sm"
                  fit="cover"
                  style={{ flexShrink: 0 }}
                />
              )}
              <Text size="sm" fw={700} lineClamp={1}>
                {item.name}
              </Text>
            </Group>
            <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
              {item.brand && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.brand}
                </Text>
              )}
              {item.source === "public" && (
                <Badge size="xs" variant="light" color="teal">
                  Catalog
                </Badge>
              )}
            </Group>
          </Group>
          <SimpleGrid cols={3} spacing={10}>
            <StatCell
              label="Calories"
              value={
                item.calories != null && item.calories > 0
                  ? item.calories.toLocaleString()
                  : null
              }
            />
            <StatCell
              label="Water"
              value={item.waterMl != null ? `${item.waterMl} mL` : null}
            />
            <StatCell
              label="Dry weight"
              value={
                item.dryWeightGrams != null ? `${item.dryWeightGrams} g` : null
              }
            />
          </SimpleGrid>
        </Stack>
      )}
      renderLoading={<SearchSkeleton />}
      emptyMessage={`No past items match "${debouncedName}" — press Enter to add it as a new item.`}
      hidden={debouncedName.length === 0}
    />
  );
}
