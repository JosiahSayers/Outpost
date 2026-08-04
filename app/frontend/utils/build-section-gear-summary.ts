import { gearStateFor } from "$/frontend/utils/api/gear-assignment";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";

export interface SectionGearSummary {
  /** Items with gear assigned. */
  assigned: number;
  /** Items still awaiting a decision. */
  undecided: number;
  /**
   * Items the count is measured against — assigned plus undecided. Items
   * marked "not tracked" leave the denominator entirely, so dismissing is
   * progress toward completion in the same way assigning is.
   */
  trackable: number;
  /** Every trackable item has been decided one way or the other. */
  settled: boolean;
  /**
   * Total grams contributed by assigned gear. Each item contributes
   * `grams × item.quantity` — packing two of something means carrying twice
   * the weight — which is the same basis `buildGearSummary` uses for the
   * inventory totals.
   */
  grams: number;
}

export function buildSectionGearSummary(
  items: ClientPackingListItem[],
  tracked: Record<string, boolean>,
): SectionGearSummary {
  let assigned = 0;
  let undecided = 0;
  let grams = 0;

  for (const item of items) {
    const state = gearStateFor(item, tracked);
    if (state === "assigned") {
      assigned += 1;
      grams += (item.assignedGear?.grams ?? 0) * item.quantity;
    } else if (state === "undecided") {
      undecided += 1;
    }
  }

  return {
    assigned,
    undecided,
    trackable: assigned + undecided,
    settled: undecided === 0,
    grams,
  };
}
