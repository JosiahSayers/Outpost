import type { PackingListItemTransformerInput } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import { transform as transformSection } from "$/transformers/packing-list-section";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { transform as transformItem } from "$/transformers/trip-packing-list/item";
import type {
  PackingList,
  PackingListSection,
  TripPackingList,
  TripPackingListItemStatus,
} from "../../../generated/prisma/browser";

export type ClientTripPackingList = Omit<
  TripPackingList,
  "createdAt" | "updatedAt"
> & {
  name: PackingList["name"];
  sections: Array<
    ClientPackingListSection & {
      items: ClientTripPackingListItem[];
    }
  >;
};

export type TripPackingListInput = TripPackingList & {
  packingList: PackingList & {
    packingListSections: Array<
      PackingListSection & {
        items: Array<
          PackingListItemTransformerInput & {
            tripPackingListItemStatuses: TripPackingListItemStatus[];
          }
        >;
      }
    >;
  };
};

export function transform(item: TripPackingListInput): ClientTripPackingList {
  return {
    id: item.id,
    tripId: item.tripId,
    packingListId: item.packingListId,
    name: item.packingList.name,
    sections: item.packingList.packingListSections.map((section) => ({
      ...transformSection(section),
      items: section.items.map(transformItem),
    })),
  };
}
