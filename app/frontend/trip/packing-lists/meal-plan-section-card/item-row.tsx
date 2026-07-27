import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { Checkbox, Text } from "@mantine/core";

export const MEAL_ITEM_GRID_COLUMNS = "56px 56px 1fr";

interface Props {
  item: ClientMealPlanItem;
  onTogglePurchased: (itemId: string, purchased: boolean) => void;
  onTogglePacked: (itemId: string, packed: boolean) => void;
}

export default function MealPlanItemRow({
  item,
  onTogglePurchased,
  onTogglePacked,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: MEAL_ITEM_GRID_COLUMNS,
        gap: 8,
        alignItems: "center",
        padding: "4px 2px",
      }}
    >
      <Checkbox
        aria-label={`Mark ${item.name} as purchased`}
        checked={item.status.purchased}
        onChange={(e) => onTogglePurchased(item.id, e.currentTarget.checked)}
        color="bark-brown"
        style={{ justifySelf: "center" }}
      />
      <Checkbox
        aria-label={`Mark ${item.name} as packed`}
        checked={item.status.packed}
        onChange={(e) => onTogglePacked(item.id, e.currentTarget.checked)}
        style={{ justifySelf: "center" }}
      />
      <Text
        size="sm"
        c={item.status.packed ? "dimmed" : undefined}
        truncate="end"
      >
        {item.name}
        {item.quantity > 1 && (
          <Text component="span" size="sm" c="dimmed">
            {" "}
            ×{item.quantity}
          </Text>
        )}
      </Text>
    </div>
  );
}
