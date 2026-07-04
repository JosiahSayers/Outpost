import { createGearInventoryItems } from "./gear-inventory";
import { createTrips } from "./trips";
import { createUsers } from "./user";

export default async function applyDevSeeds() {
  await createUsers();
  await createGearInventoryItems();
  await createTrips();
}
