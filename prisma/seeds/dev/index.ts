import { createGearInventoryItems } from "./gear-inventory";
import { createUsers } from "./user";

export default async function applyDevSeeds() {
  await createUsers();
  await createGearInventoryItems();
}
