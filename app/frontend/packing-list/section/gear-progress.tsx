import {
  gearStateFor,
  useSetTrackGearAssignment,
} from "$/frontend/utils/api/gear-assignment";
import { buildSectionGearSummary } from "$/frontend/utils/build-section-gear-summary";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { BackpackIcon, MinusCircleIcon, PlusIcon } from "@phosphor-icons/react";

interface Props {
  listId: string;
  sectionId: string;
  items: ClientPackingListItem[];
}

/**
 * The section header's gear readout, and the bulk escape hatch behind it.
 *
 * It costs no vertical space — `SectionHeader` already renders a
 * space-between row that held only a title and its controls — and it changes
 * job as the section fills in:
 *
 *   nothing decided   "0 of 4 assigned"   an invitation, in the accent colour
 *   part-way          "2 of 3 · 1.24 kg"  progress plus the running weight
 *   settled           "1.37 kg"           the fraction retires, the payoff stays
 *
 * Dismissing an item leaves the denominator rather than adding to the
 * numerator, so both answers move the section toward the same finished state.
 */
export default function GearProgress({ listId, sectionId, items }: Props) {
  const setTrackGearAssignment = useSetTrackGearAssignment(listId);
  const formatWeight = useWeightDisplay({ rollUp: true });
  const summary = buildSectionGearSummary(items);

  // A section with nothing to track has nothing to report.
  if (items.length === 0) return null;

  const weight = summary.grams > 0 ? formatWeight(summary.grams) : null;

  let label: string;
  if (summary.trackable === 0) {
    // Every item was dismissed — say so rather than showing "0 of 0".
    label = "No gear tracked";
  } else if (summary.assigned === 0) {
    // Spell it out while the count is still zero; a bare "0 of 4" teaches
    // nothing, and this is the state a brand-new or imported list opens in.
    label = `0 of ${summary.trackable} assigned`;
  } else if (summary.settled) {
    label = weight ?? `${summary.assigned} of ${summary.trackable}`;
  } else {
    label = `${summary.assigned} of ${summary.trackable}`;
    if (weight) label += ` · ${weight}`;
  }

  const undecidedItems = items.filter(
    (item) => gearStateFor(item) === "undecided",
  );
  const untrackedItems = items.filter(
    (item) => gearStateFor(item) === "untracked",
  );

  const setAll = (
    targets: ClientPackingListItem[],
    trackGearAssignment: boolean,
  ) => {
    for (const item of targets) {
      setTrackGearAssignment.mutate({ sectionId, item, trackGearAssignment });
    }
  };

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton
          aria-label="Gear assignment for this section"
          style={{ flex: 1, minWidth: 0, textAlign: "right" }}
        >
          <Group gap={4} justify="flex-end" wrap="nowrap">
            <BackpackIcon
              size={11}
              color={
                summary.assigned === 0 && !summary.settled
                  ? "var(--mantine-color-trail-green-6)"
                  : "var(--mantine-color-bark-brown-6)"
              }
              style={{ flexShrink: 0 }}
            />
            <Text
              size="xs"
              c={
                summary.assigned === 0 && !summary.settled
                  ? "trail-green.7"
                  : "dimmed"
              }
              style={{ whiteSpace: "nowrap" }}
            >
              {label}
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {undecidedItems.length > 0 && (
          <Menu.Item
            leftSection={<MinusCircleIcon size={14} />}
            onClick={() => setAll(undecidedItems, false)}
          >
            Stop tracking the remaining {undecidedItems.length}
          </Menu.Item>
        )}
        {untrackedItems.length > 0 && (
          <Menu.Item
            leftSection={<PlusIcon size={14} />}
            onClick={() => setAll(untrackedItems, true)}
          >
            Track all items in this section
          </Menu.Item>
        )}
        {undecidedItems.length === 0 && untrackedItems.length === 0 && (
          <Menu.Item disabled>Every item has gear assigned</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
