import type { GearCategory } from "../../generated/prisma/browser";

export type ClientGeatCategory = Pick<GearCategory, "id" | "name" | "public">;

export function transform(item: GearCategory): ClientGeatCategory {
  return {
    id: item.id,
    name: item.name,
    public: item.public,
  };
}
