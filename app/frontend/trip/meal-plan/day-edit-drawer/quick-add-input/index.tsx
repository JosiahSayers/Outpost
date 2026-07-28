import SearchCombobox from "$/frontend/shared-components/search-combobox";
import { MEAL_LABEL } from "$/frontend/trip/meal-plan/helpers";
import { useMealPlanItemSearch } from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { Badge, Group, SimpleGrid, Stack, Text } from "@mantine/core";
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
  onSelectExisting: (item: ClientMealPlanItem) => void;
}

export default function QuickAddInput({
  meal,
  tripId,
  onAdd,
  onSelectExisting,
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
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commit();
      }}
      results={results}
      isFetching={search.isFetching}
      getOptionValue={(item) => item.id}
      onOptionSubmit={(item) => {
        onSelectExisting(item);
        setName("");
      }}
      icon={<BowlFoodIcon size={16} color="var(--mantine-color-dimmed)" />}
      renderOption={(item) => (
        <Stack gap={6}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text size="sm" fw={700} lineClamp={1}>
              {item.name}
            </Text>
            <Badge
              color={item.meal === meal ? "trail-green" : "stone-gray"}
              variant={item.meal === meal ? "filled" : "light"}
            >
              {MEAL_LABEL[item.meal]}
            </Badge>
          </Group>
          <SimpleGrid cols={3} spacing={10}>
            <StatCell
              label="Calories"
              value={item.calories > 0 ? item.calories.toLocaleString() : null}
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
      emptyMessage={`No past items match "${debouncedName}"`}
      hidden={debouncedName.length === 0}
    />
  );
}
