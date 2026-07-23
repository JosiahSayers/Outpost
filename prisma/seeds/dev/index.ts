import { createGearInventoryItems } from "./gear-inventory";
import { createPlaces } from "./places";
import { createTrips } from "./trips";
import { createUsers } from "./user";

export default async function applyDevSeeds() {
  await createUsers();
  await createGearInventoryItems();
  await createTrips();
  await createPlaces();
}
