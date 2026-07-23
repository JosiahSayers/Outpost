import { seedPlaces } from "../../../tests/helpers/test-data/seed-places";

export async function createPlaces() {
  await seedPlaces();
}
