import { Box } from "@mantine/core";
import { BowlFoodIcon } from "@phosphor-icons/react";

const PLACEHOLDER_COLORS = [
  "trail-green",
  "bark-brown",
  "trail-dust",
  "stone-gray",
] as const;

// No two adjacent-in-the-alphabet items should look identical, but the same
// item should always render the same color -- hash the id instead of using
// list index (which shifts as pages/filters change).
function colorForId(id: string): (typeof PLACEHOLDER_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  // hash % length is always a valid index into the fixed-length array above.
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length]!;
}

interface Props {
  item: { id: string; name: string; imageUrl: string | null };
  size: number;
  radius?: number;
}

export default function MealThumb({ item, size, radius = 8 }: Props) {
  if (item.imageUrl) {
    return (
      <Box
        component="img"
        src={item.imageUrl}
        alt={item.name}
        w={size}
        h={size}
        style={{
          objectFit: "cover",
          borderRadius: radius,
          flexShrink: 0,
        }}
      />
    );
  }

  const color = colorForId(item.id);

  return (
    <Box
      bg={`${color}.1`}
      c={`${color}.7`}
      w={size}
      h={size}
      style={{
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BowlFoodIcon size={Math.round(size * 0.55)} />
    </Box>
  );
}
