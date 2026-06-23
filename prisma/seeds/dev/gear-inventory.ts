import { db } from "$/utils/db";

export async function createGearInventoryItems() {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });

  const [backpacks, tents, waterFilters] = await Promise.all([
    db.gearCategory.findFirstOrThrow({ where: { name: "Backpacks" } }),
    db.gearCategory.findFirstOrThrow({ where: { name: "Tents" } }),
    db.gearCategory.findFirstOrThrow({ where: { name: "Water Filters" } }),
  ]);

  await db.gearInventoryItem.create({
    data: {
      name: "Durston X-Mid 1",
      quantity: 1,
      gearCategoryId: tents.id,
      grams: 745,
      userId: user.id,
    },
  });

  await db.gearInventoryItem.create({
    data: {
      name: "Gergory Zulu 45",
      quantity: 1,
      gearCategoryId: backpacks.id,
      grams: 1615,
      userId: user.id,
    },
  });

  await db.gearInventoryItem.create({
    data: {
      name: "Platypus QuickDraw",
      quantity: 1,
      gearCategoryId: waterFilters.id,
      grams: 82,
      userId: user.id,
    },
  });
}
