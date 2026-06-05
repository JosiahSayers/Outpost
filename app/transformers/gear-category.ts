import type { GearCategory } from "../../generated/prisma/browser";

export type ClientGearCategory = Pick<GearCategory, "id" | "name" | "public">;

export function transform(item: GearCategory): ClientGearCategory {
  return {
    id: item.id,
    name: item.name,
    public: item.public,
  };
}
