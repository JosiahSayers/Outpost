import { db } from "$/utils/db";

// The canonical gear inventory that dashboard/gear-inventory assertions are
// written against (item names, per-item grams, the derived "5.38 lb" total,
// and the three unique categories). Kept as data so both the dev seed and the
// e2e fixtures provision an identical set and can never drift apart.
export const CANONICAL_GEAR = [
  { name: "Durston X-Mid 1", grams: 745, category: "Tents" },
  { name: "Gergory Zulu 45", grams: 1615, category: "Backpacks" },
  { name: "Platypus QuickDraw", grams: 82, category: "Water Filters" },
] as const;

// Provision the canonical gear inventory for a single user. The categories are
// global (production-seeded), so this only creates the user-owned items.
export async function seedGearInventory(userId: string) {
  const categoryNames = [...new Set(CANONICAL_GEAR.map((g) => g.category))];
  const categories = await db.gearCategory.findMany({
    where: { name: { in: categoryNames } },
  });
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

  await db.gearInventoryItem.createMany({
    data: CANONICAL_GEAR.map((item) => {
      const gearCategoryId = categoryIdByName.get(item.category);
      if (!gearCategoryId) {
        throw new Error(
          `Gear category "${item.category}" not found — is the production seed applied?`,
        );
      }
      return {
        name: item.name,
        quantity: 1,
        grams: item.grams,
        gearCategoryId,
        userId,
      };
    }),
  });
}
