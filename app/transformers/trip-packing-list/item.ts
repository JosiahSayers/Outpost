import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type {
  PackingListItem,
  TripPackingListItemStatus,
} from "../../../generated/prisma/browser";
import { transform as packingListItemTransfrom } from "../packing-list-item";

type ClientTripPackingListItemStatus = Omit<
  TripPackingListItemStatus,
  "id" | "createdAt" | "updatedAt" | "packingListItemId" | "tripPackingListId"
>;

export type ClientTripPackingListItem = ClientPackingListItem & {
  status: ClientTripPackingListItemStatus;
};

export function transform(
  item: PackingListItem & {
    tripPackingListItemStatuses: TripPackingListItemStatus[];
  },
): ClientTripPackingListItem {
  return {
    ...packingListItemTransfrom(item),
    status: {
      packed: item.tripPackingListItemStatuses[0]?.packed ?? false,
      notNeeded: item.tripPackingListItemStatuses[0]?.notNeeded ?? false,
    },
  };
}
