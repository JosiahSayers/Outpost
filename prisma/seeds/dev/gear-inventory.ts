import { db } from "$/utils/db";
import { seedGearInventory } from "../../../tests/helpers/test-data/seed-gear";

export async function createGearInventoryItems() {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });

  await seedGearInventory(user.id);
}
