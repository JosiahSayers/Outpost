import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { gearStateFor } from "$/frontend/utils/api/gear-assignment";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import {
  useCreateItem,
  useUpdateItem,
} from "$/frontend/utils/api/packing-list";
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
  NumberInput,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  BackpackIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MinusCircleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

export interface ItemDrawerTarget {
  sectionId: string;
  item: ClientPackingListItem;
  /** A just-created item, whose placeholder name should start selected. */
  isNew?: boolean;
}

interface Props {
  listId: string;
  opened: boolean;
  target: ItemDrawerTarget | null;
  onClose: () => void;
  onDelete: (sectionId: string, item: ClientPackingListItem) => void;
}

// Mirrors `name` in $/validation/packing-list/item, so a name the API would
// reject is caught here instead of failing silently after the drawer closes.
const MIN_NAME_LENGTH = 3;

// Groups are keyed by category name rather than id, so a custom category that
// happens to share a public category's name already renders as one group —
// `priorityCategoryName` (the packing list item's own expected category)
// piggybacks on that: whichever group's name matches it (case-insensitively)
// sorts first, everything else stays alphabetical.
function groupByCategory(
  items: ClientGearInventoryItem[],
  priorityCategoryName?: string,
) {
  const groups = new Map<string, ClientGearInventoryItem[]>();
  for (const item of items) {
    const existing = groups.get(item.category.name);
    if (existing) existing.push(item);
    else groups.set(item.category.name, [item]);
  }
  const priorityNeedle = priorityCategoryName?.toLowerCase();
  return [...groups.entries()].sort(([a], [b]) => {
    if (priorityNeedle) {
      const aMatches = a.toLowerCase() === priorityNeedle;
      const bMatches = b.toLowerCase() === priorityNeedle;
      if (aMatches !== bMatches) return aMatches ? -1 : 1;
    }
    return a.localeCompare(b);
  });
}

/**
 * Everything you can do to one packing list item, on one surface.
 *
 * Rows used to carry six separate touch targets — name, quantity, gear, the
 * gear slot, delete and drag — which is unworkable at a phone's width. All the
 * mutations that need precision now live here, leaving the row with one tap to
 * open this, plus drag and optional for quick passes.
 *
 * Name, quantity and gear are all staged locally and committed together by
 * Save, so picking gear can't discard a half-typed name. Delete is the one
 * exception: it applies straight away, behind a confirmation.
 *
 * A new item isn't persisted until Save — `target.isNew` means the drawer is
 * holding a local draft with no row in the database yet, so Cancel/Escape can
 * just close without leaving anything behind to clean up.
 */
export default function ItemDrawer({
  listId,
  opened,
  target,
  onClose,
  onDelete,
}: Props) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
          Edit item
        </Text>
      }
    >
      {/* Keyed so every field resets to the item being opened. The target
          outlives `opened` so the drawer still has something to render while
          its close transition plays. */}
      {target && (
        <ItemDrawerForm
          key={target.item.id}
          listId={listId}
          opened={opened}
          target={target}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
    </Drawer>
  );
}

function ItemDrawerForm({
  listId,
  opened,
  target,
  onClose,
  onDelete,
}: Props & { target: ItemDrawerTarget }) {
  const { sectionId, item } = target;

  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [gear, setGear] = useState<ClientGearInventoryItem | null>(
    item.assignedGear,
  );
  const [isTracked, setIsTracked] = useState(
    gearStateFor(item) !== "untracked",
  );
  const [query, setQuery] = useState("");
  const [confirmOpened, confirm] = useDisclosure(false);

  // Only fetch once the drawer is open; the packing list page would otherwise
  // pull the whole inventory on every load.
  const inventory = useGearInventory(opened);
  const createItem = useCreateItem(listId);
  const updateItem = useUpdateItem(listId);
  const formatWeight = useWeightDisplay();

  const inventoryItems = inventory.data?.items ?? [];
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? inventoryItems.filter(
          (candidate) =>
            candidate.name.toLowerCase().includes(needle) ||
            candidate.category.name.toLowerCase().includes(needle),
        )
      : inventoryItems;
    return groupByCategory(matches, item.category?.name);
  }, [inventoryItems, query, item.category?.name]);

  const trimmedName = name.trim();
  const nameError =
    trimmedName.length > 0 && trimmedName.length < MIN_NAME_LENGTH
      ? `Use at least ${MIN_NAME_LENGTH} characters`
      : null;
  const canSave = trimmedName.length >= MIN_NAME_LENGTH;

  // Name, quantity, gear and tracking all land in the same PATCH/POST body —
  // one request against one endpoint, so a failure can't leave the item
  // half-saved. The drawer only closes once that request has actually
  // succeeded; on error it stays open with the entered data intact so the
  // user can retry instead of redoing it from scratch.
  const handleSave = () => {
    if (!canSave) return;

    if (target.isNew) {
      createItem.mutate(
        {
          sectionId,
          name: trimmedName,
          quantity,
          assignedGearId: gear?.id,
          trackGearAssignment: isTracked,
        },
        {
          onSuccess: onClose,
          onError: notifyError("Couldn't add item"),
        },
      );
      return;
    }

    updateItem.mutate(
      {
        sectionId,
        itemId: item.id,
        name: trimmedName,
        quantity,
        assignedGearId: gear?.id ?? null,
        assignedGear: gear,
        trackGearAssignment: isTracked,
        sortPosition: item.sortPosition,
      },
      {
        onSuccess: onClose,
        onError: notifyError("Couldn't update item"),
      },
    );
  };

  const isSaving = createItem.isPending || updateItem.isPending;

  const handleDelete = () => {
    onDelete(sectionId, item);
    confirm.close();
    onClose();
  };

  return (
    <Stack gap="md" pt="xs">
      <TextInput
        label="Name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        error={nameError}
        required
        autoFocus
        onFocus={(e) => {
          // A newly added item arrives named "New item"; select it so the
          // first keystroke replaces the placeholder.
          if (target.isNew) e.currentTarget.select();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSave && !isSaving) handleSave();
        }}
      />
      <NumberInput
        label="Quantity"
        value={quantity}
        onChange={(value) =>
          setQuantity(typeof value === "number" && value > 0 ? value : 1)
        }
        min={1}
        allowDecimal={false}
        w={120}
      />

      <Divider label="Gear" labelPosition="left" />

      {gear ? (
        <Group
          gap="xs"
          wrap="nowrap"
          p="xs"
          style={{
            borderRadius: "var(--mantine-radius-sm)",
            background: "var(--mantine-color-bark-brown-0)",
          }}
        >
          <BackpackIcon
            size={16}
            color="var(--mantine-color-bark-brown-6)"
            style={{ flexShrink: 0 }}
          />
          <Text size="sm" fw={600} truncate="end" style={{ flex: 1 }}>
            {gear.name}
          </Text>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {formatWeight(gear.grams)}
          </Text>
          <UnstyledButton
            onClick={() => setGear(null)}
            aria-label="Remove assigned gear"
            style={{ display: "inline-flex", flexShrink: 0 }}
          >
            <XIcon size={12} />
          </UnstyledButton>
        </Group>
      ) : isTracked ? (
        <Text size="sm" c="dimmed">
          No gear assigned yet.
        </Text>
      ) : (
        <Group gap="xs">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            Not tracking gear for this item.
          </Text>
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => setIsTracked(true)}
          >
            Undo
          </Button>
        </Group>
      )}

      {isTracked && (
        <>
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search your inventory…"
            aria-label="Search your gear inventory"
            leftSection={<MagnifyingGlassIcon size={14} />}
          />

          {inventory.isPending && (
            <Group gap="xs" justify="center" py="sm">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                Loading your gear…
              </Text>
            </Group>
          )}

          {!inventory.isPending && inventoryItems.length === 0 && (
            <Text size="sm" c="dimmed">
              Your gear inventory is empty. Add gear from the Gear page, then
              come back to assign it here.
            </Text>
          )}

          {!inventory.isPending &&
            inventoryItems.length > 0 &&
            groups.length === 0 && (
              <Text size="sm" c="dimmed">
                No gear matches &ldquo;{query}&rdquo;.
              </Text>
            )}

          <Stack gap="sm" mah={280} style={{ overflowY: "auto" }}>
            {groups.map(([category, categoryItems]) => (
              <Stack key={category} gap={2}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  {category}
                </Text>
                {categoryItems.map((candidate) => {
                  const selected = candidate.id === gear?.id;
                  return (
                    <UnstyledButton
                      key={candidate.id}
                      onClick={() => setGear(candidate)}
                      px="xs"
                      py={8}
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
                          {candidate.name}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                          {formatWeight(candidate.grams)}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            ))}
          </Stack>

          {/* The other half of the decision: an item can be finished by ruling
              gear out, not only by choosing some. The label names the action
              rather than the resulting state — "Not tracking…" reads like a
              status even while gear sits assigned above it — and calls out
              the extra clear step when there's a pick to undo. */}
          <UnstyledButton
            onClick={() => {
              setGear(null);
              setIsTracked(false);
            }}
          >
            <Group gap="xs">
              <MinusCircleIcon size={14} />
              <Text size="sm" c="dimmed">
                {gear
                  ? "Remove gear and stop tracking"
                  : "Stop tracking gear for this item"}
              </Text>
            </Group>
          </UnstyledButton>
        </>
      )}

      <Divider />

      <Group justify="space-between">
        {/* "Delete item", not "Delete": the page also carries a "Delete list"
            control, and this drawer sits next to Cancel and Save. Nothing to
            delete yet for a draft that was never saved — Cancel covers it. */}
        {target.isNew ? (
          <div />
        ) : (
          <Button
            variant="subtle"
            color="red"
            leftSection={<TrashIcon size={14} />}
            onClick={confirm.open}
          >
            Delete item
          </Button>
        )}
        <Group gap="xs">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} loading={isSaving}>
            Save
          </Button>
        </Group>
      </Group>

      {!target.isNew && (
        <ConfirmDeleteModal
          opened={confirmOpened}
          onClose={confirm.close}
          onConfirm={handleDelete}
          title="Delete item?"
        >
          Remove <strong>{item.name}</strong> from this section? This can&apos;t
          be undone.
        </ConfirmDeleteModal>
      )}
    </Stack>
  );
}
