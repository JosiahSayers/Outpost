import { db } from "$/utils/db";
import { searchCategories, searchMealPlanItems } from "$/utils/search-helpers";
import { beforeEach, describe, expect, it } from "bun:test";
import type {
  GearCategory,
  MealPlanDay,
  Trip,
  User,
} from "../../../generated/prisma/client";
import { make } from "../../helpers/test-data/make";

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

describe("searchMealPlanItems", () => {
  let user: User;
  let user2: User;

  beforeEach(async () => {
    user = (await db.user.findUnique({ where: { email: "user@test.com" } }))!;
    user2 = (await db.user.findUnique({ where: { email: "user2@test.com" } }))!;
  });

  it("returns a row for a full match", async () => {
    const expectedMatch = await db.mealPlanItem.findFirst({
      where: { name: "Instant Oatmeal" },
    });
    const results = await searchMealPlanItems("instant oatmeal", user.id);
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns a row for a partial match", async () => {
    const expectedMatch = await db.mealPlanItem.findFirst({
      where: { name: "Instant Oatmeal" },
    });
    const results = await searchMealPlanItems("oat", user.id);
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns a row for multiple word partial matches", async () => {
    const expectedMatch = await db.mealPlanItem.findFirst({
      where: { name: "Trail Mix" },
    });
    const results = await searchMealPlanItems("tr mi", user.id);
    expect(results).toContainEqual(expectedMatch!);
  });

  it("does not return items belonging to another user's trips", async () => {
    const results = await searchMealPlanItems("instant oatmeal", user2.id);
    expect(results).toEqual([]);
  });

  describe("excludeTripId option", () => {
    let trip: Trip;
    let mealPlanDay: MealPlanDay;

    beforeEach(async () => {
      trip = await db.trip.create({ data: make("Trip", { userId: user.id }) });
      mealPlanDay = await db.mealPlanDay.create({
        data: make("MealPlanDay", { tripId: trip.id, dayNumber: 1 }),
      });
      await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          name: "Excludable Test Meal",
          mealPlanDayId: mealPlanDay.id,
        }),
      });
    });

    it("excludes items belonging to the given trip", async () => {
      const results = await searchMealPlanItems(
        "excludable test meal",
        user.id,
        { excludeTripId: trip.id },
      );
      expect(results).toEqual([]);
    });

    it("includes the item when it belongs to a different trip", async () => {
      const results = await searchMealPlanItems(
        "excludable test meal",
        user.id,
      );
      expect(results.some((item) => item.name === "Excludable Test Meal")).toBe(
        true,
      );
    });
  });
});
