import { formatMealDate } from "$/frontend/trip/meal-plan/helpers";
import { statusColor } from "$/frontend/trip/packing-lists/category-row";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import {
  Badge,
  Card,
  Collapse,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";
import MealPlanItemRow, { MEAL_ITEM_GRID_COLUMNS } from "./item-row";

export interface MealPlanSectionDay {
  day: ClientMealPlanDay;
  items: ClientMealPlanItem[];
}

interface Props {
  days: MealPlanSectionDay[];
  onToggleStatus: (
    dayNumber: number,
    itemId: string,
    data: { purchased?: boolean; packed?: boolean },
  ) => void;
}

export default function MealPlanSectionCard({ days, onToggleStatus }: Props) {
  const [opened, { toggle }] = useDisclosure(false);

  const allItems = days.flatMap(({ items }) => items);
  const total = allItems.length;
  const packedCount = allItems.filter((item) => item.status.packed).length;
  const purchasedCount = allItems.filter(
    (item) => item.status.purchased,
  ).length;

  return (
    <Card
      withBorder
      padding="sm"
      bg="trail-green.0"
      style={{ borderColor: "var(--mantine-color-trail-green-2)" }}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        gap="xs"
        onClick={toggle}
        style={{ cursor: "pointer" }}
      >
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: `var(--mantine-color-${statusColor(packedCount, total)}-6)`,
            }}
          />
          <Text fw={600} size="sm" truncate="end">
            Meal Plan
          </Text>
          <Tooltip
            label="Synced automatically from your meal plan — items appear and disappear as you edit it there"
            multiline
            w={260}
          >
            <Badge
              color="trail-green"
              variant="light"
              size="xs"
              style={{ cursor: "help" }}
            >
              Auto-synced
            </Badge>
          </Tooltip>
        </Group>
        <Group gap={10} wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text
            size="sm"
            c="dimmed"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {purchasedCount}/{total} purchased
          </Text>
          <Text
            size="sm"
            c="dimmed"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {packedCount}/{total} packed
          </Text>
          <CaretDownIcon
            size={14}
            style={{
              transform: opened ? "rotate(180deg)" : undefined,
              transition: "transform 150ms ease",
              flexShrink: 0,
            }}
          />
        </Group>
      </Group>

      <Collapse expanded={opened}>
        <Stack gap="sm" mt="sm">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: MEAL_ITEM_GRID_COLUMNS,
              gap: 8,
              padding: "0 2px",
            }}
          >
            <Text
              size="9px"
              fw={700}
              tt="uppercase"
              c="dimmed"
              ta="center"
              style={{ letterSpacing: "0.04em" }}
            >
              Purchased
            </Text>
            <Text
              size="9px"
              fw={700}
              tt="uppercase"
              c="dimmed"
              ta="center"
              style={{ letterSpacing: "0.04em" }}
            >
              Packed
            </Text>
            <span />
          </div>

          {days.map(({ day, items }) => (
            <Stack gap={2} key={day.id}>
              <Text
                size="xs"
                fw={700}
                tt="uppercase"
                c="dimmed"
                style={{ letterSpacing: "0.04em" }}
              >
                Day {day.dayNumber}
                {day.date && ` · ${formatMealDate(day.date)}`}
              </Text>
              {items.map((item) => (
                <MealPlanItemRow
                  key={item.id}
                  item={item}
                  onTogglePurchased={(itemId, purchased) =>
                    onToggleStatus(day.dayNumber, itemId, { purchased })
                  }
                  onTogglePacked={(itemId, packed) =>
                    onToggleStatus(day.dayNumber, itemId, { packed })
                  }
                />
              ))}
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Card>
  );
}
