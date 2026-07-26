import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import {
  mergeCategories,
  packingCompletion,
  placeholderPackingLists,
  type PlaceholderPackingItem,
  type PlaceholderPackingList,
} from "$/frontend/trip/placeholder-data";
import { Button, Stack, Title } from "@mantine/core";
import { useMemo, useState } from "react";

export default function PackingListSection() {
  const [lists, setLists] = useState<PlaceholderPackingList[]>(
    placeholderPackingLists,
  );

  const categories = useMemo(() => mergeCategories(lists), [lists]);
  const { packed, total } = packingCompletion(lists);

  function updateItem(
    itemId: string,
    updates: Partial<Pick<PlaceholderPackingItem, "packed" | "notNeeded">>,
  ) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        categories: list.categories.map((category) => ({
          ...category,
          items: category.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item,
          ),
        })),
      })),
    );
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Packing Lists</Title>

      <ProgressOverview
        packed={packed}
        total={total}
        numberOfPackingLists={lists.length}
      />

      <Stack gap="xs">
        {categories.map((category) => (
          <CategoryRow
            key={category.name}
            category={category}
            onTogglePacked={(itemId, packed) => updateItem(itemId, { packed })}
            onToggleNotNeeded={(itemId, notNeeded) =>
              updateItem(itemId, { notNeeded })
            }
          />
        ))}
        <Button variant="subtle" size="sm" style={{ alignSelf: "flex-start" }}>
          Assign a packing list
        </Button>
      </Stack>
    </Stack>
  );
}
