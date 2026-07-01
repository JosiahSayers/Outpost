import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import type {
  PackingList,
  PackingListItem,
  PackingListSection,
} from "../../generated/prisma/browser";
import { transform as transformItem } from "./packing-list-item";
import { transform as transformSection } from "./packing-list-section";

export type ClientPackingList = Pick<
  PackingList,
  | "id"
  | "name"
  | "public"
  | "sourceUrl"
  | "description"
  | "copiedFromPackingListId"
> & {
  editable: boolean;
  totalItems: number;
  totalUniqueItems: number;
  totalSections: number;
};
export type ClientFullPackingList = ClientPackingList & {
  sections: Array<
    ClientPackingListSection & { items: Array<ClientPackingListItem> }
  >;
};

export type FullPackingList = PackingList & {
  packingListSections: Array<
    PackingListSection & { items: Array<PackingListItem> }
  >;
};

export function transform<ReturnFull extends boolean>(
  item: FullPackingList,
  returnFullVersion: ReturnFull,
  currentUserId?: string | null,
): ReturnFull extends true ? ClientFullPackingList : ClientPackingList {
  const flatItems = item.packingListSections.flatMap((s) => s.items);

  const baseMap: ClientPackingList = {
    id: item.id,
    name: item.name,
    public: item.public,
    sourceUrl: item.sourceUrl,
    description: item.description,
    copiedFromPackingListId: item.copiedFromPackingListId,
    editable: item.userId != null && item.userId === currentUserId,
    totalItems: flatItems.length,
    totalUniqueItems: flatItems.reduce((acc, item) => acc + item.quantity, 0),
    totalSections: item.packingListSections.length,
  };

  if (returnFullVersion) {
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
