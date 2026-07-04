import { ModelName } from "../../../generated/prisma/internal/prismaNamespace";
import type { PickStringLiteral } from "../../../type-helpers";
import makeGearCategory from "./generators/gear-category";
import makeGearInventoryItem from "./generators/gear-inventory-item";
import makePackingList from "./generators/packing-list";
import makePackingListItem from "./generators/packing-list-item";
import makePackingListSection from "./generators/packing-list-section";
import makeTrip from "./generators/trip";

type SupportedModels = PickStringLiteral<
  ModelName,
  | "GearInventoryItem"
  | "GearCategory"
  | "PackingList"
  | "PackingListSection"
  | "PackingListItem"
  | "Trip"
>;

const generators = {
  GearCategory: makeGearCategory,
  GearInventoryItem: makeGearInventoryItem,
  PackingList: makePackingList,
  PackingListSection: makePackingListSection,
  PackingListItem: makePackingListItem,
  Trip: makeTrip,
} as const;

export function make<Model extends SupportedModels>(
  model: Model,
  options?: Parameters<(typeof generators)[Model]>[0],
): ReturnType<(typeof generators)[Model]> {
  const generator = generators[model] as (
    options?: Parameters<(typeof generators)[Model]>[0],
  ) => ReturnType<(typeof generators)[Model]>;
  return generator(options);
}
