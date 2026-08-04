import {
  useAssignGear,
  useClearGear,
  useSetGearTracked,
} from "$/frontend/utils/api/gear-assignment";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import {
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

export interface AssignGearTarget {
  sectionId: string;
  item: ClientPackingListItem;
}

interface Props {
  listId: string;
  opened: boolean;
  target: AssignGearTarget | null;
  onClose: () => void;
}

function groupByCategory(items: ClientGearInventoryItem[]) {
  const groups = new Map<string, ClientGearInventoryItem[]>();
  for (const item of items) {
    const key = item.category.name;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * The one surface for deciding an item's gear: assign a piece of inventory,
 * swap it, clear it, or declare that this item isn't tracked against gear at
 * all. Every row treatment opens this same drawer.
 *
 * The whole inventory is already available from one request, so the search
 * filters client-side and answers instantly — no debounce, no per-keystroke
 * fetch, and browsing by category works without typing anything.
 */
export default function AssignGearDrawer({
  listId,
  opened,
  target,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  // Only fetch once the drawer is actually open; the packing list page
  // otherwise pays for the whole inventory on every load.
  const inventory = useGearInventory(opened);
  const assignGear = useAssignGear(listId);
  const clearGear = useClearGear(listId);
  const setGearTracked = useSetGearTracked();
  const formatWeight = useWeightDisplay();

  const items = inventory.data?.items ?? [];
  const assignedId = target?.item.assignedGear?.id ?? null;

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.category.name.toLowerCase().includes(needle),
        )
      : items;
    return groupByCategory(matches);
  }, [items, query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleAssign = (gear: ClientGearInventoryItem) => {
    if (!target) return;
    assignGear.mutate(
      { sectionId: target.sectionId, item: target.item, gear },
      { onError: notifyError("Couldn't assign gear") },
    );
    handleClose();
  };

  const handleRemove = () => {
    if (!target) return;
    clearGear(target.item.id);
    handleClose();
  };

  const handleStopTracking = () => {
    if (!target) return;
    setGearTracked({ [target.item.id]: false });
    handleClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size="md"
      title={
        <div>
          <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
            Assign gear
          </Text>
          {target && (
            <Text size="xs" c="dimmed">
              for &ldquo;{target.item.name}&rdquo;
            </Text>
          )}
        </div>
      }
    >
      <Stack gap="sm" pt="xs">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search your inventory…"
          aria-label="Search your gear inventory"
          leftSection={<MagnifyingGlassIcon size={14} />}
        />

        {inventory.isPending && (
          <Group gap="xs" justify="center" py="md">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              Loading your gear…
            </Text>
          </Group>
        )}

        {!inventory.isPending && items.length === 0 && (
          <Text size="sm" c="dimmed" py="md">
            Your gear inventory is empty. Add gear from the Gear page, then come
            back to assign it here.
          </Text>
        )}

        {!inventory.isPending && items.length > 0 && groups.length === 0 && (
          <Text size="sm" c="dimmed" py="md">
            No gear matches &ldquo;{query}&rdquo;.
          </Text>
        )}

        {groups.map(([category, categoryItems]) => (
          <Stack key={category} gap={2}>
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              {category}
            </Text>
            {categoryItems.map((gear) => {
              const selected = gear.id === assignedId;
              return (
                <UnstyledButton
                  key={gear.id}
                  onClick={() => handleAssign(gear)}
                  px="xs"
                  py={6}
                  style={{
                    borderRadius: "var(--mantine-radius-sm)",
                    background: selected
                      ? "var(--mantine-color-bark-brown-0)"
                      : undefined,
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    {selected && (
                      <CheckCircleIcon
                        size={14}
                        weight="fill"
                        color="var(--mantine-color-bark-brown-6)"
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <Text size="sm" truncate="end" style={{ flex: 1 }}>
                      {gear.name}
                    </Text>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {formatWeight(gear.grams)}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        ))}

        <Divider mt="xs" />

        {/* Dismissing is the other half of the decision, so it belongs on the
            same surface as choosing — not behind a separate control. */}
        <UnstyledButton onClick={handleStopTracking}>
          <Group gap="xs">
            <MinusCircleIcon size={14} />
            <Text size="sm" c="dimmed">
              Not tracking gear for this item
            </Text>
          </Group>
        </UnstyledButton>

        <Group justify="space-between" mt="xs">
          {target?.item.assignedGear ? (
            <Button variant="subtle" color="red" onClick={handleRemove}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={handleClose}>Done</Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
