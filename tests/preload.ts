import { beforeEach, afterEach } from "bun:test";
import { db } from "../app/utils/db";

beforeEach(() => {
  db.$executeRaw`SAVEPOINT before_test`;
});

afterEach(() => {
  db.$executeRaw`ROLLBACK TO SAVEPOINT before_test`;
});
