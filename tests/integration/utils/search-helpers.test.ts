import { db } from "$/utils/db";
import { searchCategories } from "$/utils/search-helpers";
import { beforeEach, describe, expect, it } from "bun:test";
import type { GearCategory, User } from "../../../generated/prisma/client";

describe("searchCategories", () => {
  it("returns a row for a full match", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Bidets" },
    });
    const results = await searchCategories("bidets");
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns a row for a partial match", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Bidets" },
    });
    const results = await searchCategories("biD");
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns a row for multiple word full matches", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Pack Organization" },
    });
    const results = await searchCategories("Pack organization");
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns a row for multiple word partial matches", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Pack Organization" },
    });
    const results = await searchCategories("p org");
    expect(results).toContainEqual(expectedMatch!);
  });

  describe("when the user has custom categories", () => {
    let customCategory: GearCategory;
    let user: User;

    beforeEach(async () => {
      user = (await db.user.findUnique({ where: { email: "user@test.com" } }))!;

      customCategory = (await db.gearCategory.create({
        data: {
          name: "Custom Test Gear Category",
          userId: user.id,
        },
      }))!;
    });

    it("returns the custom category", async () => {
      const results = await searchCategories("custom test gear", user.id);
      expect(results).toContainEqual(customCategory);
    });

    it("does not return the custom category for another user", async () => {
      const user2 = await db.user.findUnique({
        where: { email: "user2@test.com" },
      });
      const results = await searchCategories("custom test gear", user2!.id);
      expect(results).not.toContainEqual(customCategory);
    });

    it("does not return the custom category when a user is not provided", async () => {
      const results = await searchCategories("custom test gear");
      expect(results).not.toContainEqual(customCategory);
    });
  });
});
