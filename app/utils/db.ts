import { PrismaClient } from "$/../generated/prisma/client";
import { createTestDb } from "$/utils/test-db";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const realDb = new PrismaClient({
  adapter,
});

export const db =
  process.env.NODE_ENV === "test" ? createTestDb(realDb) : realDb;
