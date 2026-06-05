import { createUsers } from "./user";

export default async function applyDevSeeds() {
  await createUsers();
}
