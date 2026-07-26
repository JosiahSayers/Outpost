import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import { transform as transformSection } from "$/transformers/packing-list-section";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { transform as transformItem } from "$/transformers/trip-packing-list/item";
import type {
  PackingList,
  PackingListItem,
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

type Input = TripPackingList & {
  packingList: PackingList & {
    packingListSections: Array<
      PackingListSection & {
        items: Array<
          PackingListItem & {
            tripPackingListItemStatuses: TripPackingListItemStatus[];
          }
        >;
      }
    >;
  };
};

export function transform(item: Input): ClientTripPackingList {
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
