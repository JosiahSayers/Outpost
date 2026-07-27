import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { Button, Collapse, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon } from "@phosphor-icons/react";

interface Props {
  items: ClientTripPackingListItem[];
  onToggleNotNeeded: (itemId: string, notNeeded: boolean) => void;
}

export default function ExcludedItems({ items, onToggleNotNeeded }: Props) {
  const [open, { toggle: toggleOpen }] = useDisclosure(false);

  return (
    <>
      <Group gap={6} mt="xs" onClick={toggleOpen} style={{ cursor: "pointer" }}>
        <CaretDownIcon
          size={12}
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 150ms ease",
          }}
        />
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
          style={{ letterSpacing: "0.04em" }}
        >
          Not needed for this trip ({items.length})
        </Text>
      </Group>

      <Collapse expanded={open}>
        <Stack gap={4} mt={4} pl="md">
          {items.map((item) => (
            <Group key={item.id} justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed" td="line-through" truncate="end">
                {item.name}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={() => onToggleNotNeeded(item.id, false)}
              >
                Include
              </Button>
            </Group>
          ))}
        </Stack>
      </Collapse>
    </>
  );
}
