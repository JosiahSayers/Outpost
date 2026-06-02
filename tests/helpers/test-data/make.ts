import { ModelName } from "../../../generated/prisma/internal/prismaNamespace";
import type { PickStringLiteral } from "../../../type-helpers";
import makeGearCategory from "./generators/gear-category";
import makeGearInventoryItem from "./generators/gear-inventory-item";

type SupportedModels = PickStringLiteral<
  ModelName,
  "GearInventoryItem" | "GearCategory"
>;

const generators = {
  GearCategory: makeGearCategory,
  GearInventoryItem: makeGearInventoryItem,
} as const;

export function make<Model extends SupportedModels>(
  model: Model,
  options?: Parameters<(typeof generators)[Model]>[0],
): ReturnType<(typeof generators)[Model]> {
  return generators[model](options) as ReturnType<(typeof generators)[Model]>;
}
