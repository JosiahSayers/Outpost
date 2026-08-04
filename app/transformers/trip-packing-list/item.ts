import type {
  ClientPackingListItem,
  PackingListItemTransformerInput,
} from "$/transformers/packing-list-item";
import type { TripPackingListItemStatus } from "../../../generated/prisma/browser";
import { transform as packingListItemTransfrom } from "../packing-list-item";

type ClientTripPackingListItemStatus = Omit<
  TripPackingListItemStatus,
  "id" | "createdAt" | "updatedAt" | "packingListItemId" | "tripPackingListId"
>;

export type ClientTripPackingListItem = ClientPackingListItem & {
  status: ClientTripPackingListItemStatus;
};

export function transform(
  item: PackingListItemTransformerInput & {
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
