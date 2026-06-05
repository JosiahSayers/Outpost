import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import type {
  PackingList,
  PackingListItem,
  PackingListSection,
} from "../../generated/prisma/browser";
import { transform as transformSection } from "./packing-list-section";
import { transform as transformItem } from "./packing-list-item";

export type ClientPackingList = Pick<
  PackingList,
  "id" | "name" | "public" | "sourceUrl" | "description"
>;
export type ClientFullPackingList = ClientPackingList & {
  sections: Array<
    ClientPackingListSection & { items: Array<ClientPackingListItem> }
  >;
};

type FullPackingList = PackingList & {
  packingListSections: Array<
    PackingListSection & { items: Array<PackingListItem> }
  >;
};

function isFullPackingList(
  item: PackingList | FullPackingList,
): item is FullPackingList {
  return "packingListSections" in item;
}

export function transform<Input extends PackingList | FullPackingList>(
  item: Input,
): Input extends FullPackingList ? ClientFullPackingList : ClientPackingList {
  const baseMap: ClientPackingList = {
    id: item.id,
    name: item.name,
    public: item.public,
    sourceUrl: item.sourceUrl,
    description: item.description,
  };

  if (isFullPackingList(item)) {
    return {
      ...baseMap,
      sections: item.packingListSections.map((section) => ({
        ...transformSection(section),
        items: section.items.map(transformItem),
      })),
    } as any;
  } else {
    return baseMap as any;
  }
}
