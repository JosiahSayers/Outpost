import type { ClientPackingListItem } from "$/transformers/packing-list-item";

/** Where an item sits in the assign-or-dismiss decision. */
export type GearState = "assigned" | "undecided" | "untracked";

export function gearStateFor(item: ClientPackingListItem): GearState {
  if (item.assignedGear) return "assigned";
  return item.trackGearAssignment === false ? "untracked" : "undecided";
}
