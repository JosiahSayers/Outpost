import { PrismaClient } from "$/../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createTestDb } from "$/utils/test-db";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const realDb = new PrismaClient({
  adapter,
});

export const db = Bun.env.NODE_ENV === "test" ? createTestDb(realDb) : realDb;
