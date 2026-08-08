import { createGearInventoryItems } from "./gear-inventory";
import { createNotifications } from "./notifications";
import { createPlaces } from "./places";
import { createPublicMealItems } from "./public-meal-items";
import { createTrips } from "./trips";
import { createUsers } from "./user";

export default async function applyDevSeeds() {
  await createUsers();
  await createGearInventoryItems();
  await createTrips();
  await createPlaces();
  await createNotifications();
  await createPublicMealItems();
}
