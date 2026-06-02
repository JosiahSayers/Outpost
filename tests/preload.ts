import { beforeEach, afterEach, beforeAll } from "bun:test";
import { db } from "../app/utils/db";

beforeAll(async () => {
  await Bun.$`bunx -bun prisma migrate reset --force`;
  await Bun.$`bun db:seed`;
});

beforeEach(() => {
  db.$executeRaw`SAVEPOINT before_test`;
});

afterEach(() => {
  db.$executeRaw`ROLLBACK TO SAVEPOINT before_test`;
});
