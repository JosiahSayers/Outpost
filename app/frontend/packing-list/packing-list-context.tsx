import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { createContext, useContext } from "react";

interface PackingListContextValue {
  editable: boolean;
  /**
   * Opens the shared assign-gear drawer for one item. The drawer is rendered
   * once at the list level rather than per row — a row-level instance would
   * mean one mounted Drawer per item, and unmounting on close would cut off
   * its close transition. Rows reach it through here instead of threading a
   * callback down four layers.
   *
   * Undefined on read-only lists, where gear is shown but not editable.
   */
  openAssignGear?: (sectionId: string, item: ClientPackingListItem) => void;
}

const PackingListContext = createContext<PackingListContextValue>({
  editable: false,
});

export const PackingListProvider = PackingListContext.Provider;

export function usePackingList() {
  return useContext(PackingListContext);
}
