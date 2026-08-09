import { db } from "$/utils/db";
import { searchCategories, searchMealPlanItems } from "$/utils/search-helpers";
import { faker } from "@faker-js/faker";
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

  it("does not error on repeated/trailing whitespace between words", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Pack Organization" },
    });
    const results = await searchCategories("Pack  organization ");
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns an empty array for a blank query", async () => {
    const results = await searchCategories("   ");
    expect(results).toEqual([]);
  });

  it("does not error on tsquery syntax characters (OUTPOST-2)", async () => {
    const expectedMatch = await db.gearCategory.findFirst({
      where: { name: "Pack Organization" },
    });
    const results = await searchCategories("Pack & Organization");
    expect(results).toContainEqual(expectedMatch!);
  });

  it("returns an empty array for a query that is only punctuation", async () => {
    const results = await searchCategories("&");
    expect(results).toEqual([]);
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
      where: { name: "Instant Oatmeal", userId: user.id },
    });
    const results = await searchMealPlanItems("instant oatmeal", user.id);
    expect(results).toContainEqual({ source: "own", item: expectedMatch! });
  });

  it("returns a row for a partial match", async () => {
    const expectedMatch = await db.mealPlanItem.findFirst({
      where: { name: "Instant Oatmeal", userId: user.id },
    });
    const results = await searchMealPlanItems("oat", user.id);
    expect(results).toContainEqual({ source: "own", item: expectedMatch! });
  });

  it("returns a row for multiple word partial matches", async () => {
    const expectedMatch = await db.mealPlanItem.findFirst({
      where: { name: "Trail Mix", userId: user.id },
    });
    const results = await searchMealPlanItems("tr mi", user.id);
    expect(results).toContainEqual({ source: "own", item: expectedMatch! });
  });

  it("does not return items belonging to another user", async () => {
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
      const mealPlanItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "Excludable Test Meal",
        }),
      });
      await db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: mealPlanDay.id,
          mealPlanItemId: mealPlanItem.id,
          meal: "breakfast",
        }),
      });
    });

    it("excludes items already placed on the given trip's meal plan", async () => {
      const results = await searchMealPlanItems(
        "excludable test meal",
        user.id,
        { excludeTripId: trip.id },
      );
      expect(results).toEqual([]);
    });

    it("does not exclude the item when checked against a different trip", async () => {
      const otherTrip = await db.trip.create({
        data: make("Trip", { userId: user.id }),
      });
      const results = await searchMealPlanItems(
        "excludable test meal",
        user.id,
        { excludeTripId: otherTrip.id },
      );
      expect(
        results.some((result) => result.item.name === "Excludable Test Meal"),
      ).toBe(true);
    });

    it("includes the item when no excludeTripId is given", async () => {
      const results = await searchMealPlanItems(
        "excludable test meal",
        user.id,
      );
      expect(
        results.some((result) => result.item.name === "Excludable Test Meal"),
      ).toBe(true);
    });
  });

  describe("when the same item name appears more than once", () => {
    it("returns every matching row -- items are unique by construction, no dedup needed", async () => {
      await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "Duplicate Test Meal",
        }),
      });
      await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "Duplicate Test Meal",
        }),
      });

      const results = await searchMealPlanItems("duplicate test meal", user.id);
      const matches = results.filter(
        (result) => result.item.name === "Duplicate Test Meal",
      );
      expect(matches).toHaveLength(2);
    });
  });

  describe("meal option", () => {
    let trip: Trip;
    let mealPlanDay: MealPlanDay;

    beforeEach(async () => {
      trip = await db.trip.create({ data: make("Trip", { userId: user.id }) });
      mealPlanDay = await db.mealPlanDay.create({
        data: make("MealPlanDay", { tripId: trip.id, dayNumber: 1 }),
      });
      // Older item, but placed at dinner -- should still rank first.
      const dinnerItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "Rankable Test Meal Dinner Version",
          createdAt: faker.date.past(),
        }),
      });
      await db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: mealPlanDay.id,
          mealPlanItemId: dinnerItem.id,
          meal: "dinner",
        }),
      });
      // Newer item, placed at lunch -- doesn't match the "dinner" search.
      const lunchItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "Rankable Test Meal Lunch Version",
          createdAt: faker.date.recent(),
        }),
      });
      await db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: mealPlanDay.id,
          mealPlanItemId: lunchItem.id,
          meal: "lunch",
        }),
      });
    });

    it("ranks a matching meal above a more recent non-matching meal", async () => {
      const results = await searchMealPlanItems("rankable test meal", user.id, {
        meal: "dinner",
      });
      expect(results.map((result) => result.item.name)).toEqual([
        "Rankable Test Meal Dinner Version",
        "Rankable Test Meal Lunch Version",
      ]);
    });

    it("still returns non-matching meals when no meal matches", async () => {
      const results = await searchMealPlanItems("rankable test meal", user.id, {
        meal: "breakfast",
      });
      expect(results.map((result) => result.item.name).sort()).toEqual([
        "Rankable Test Meal Dinner Version",
        "Rankable Test Meal Lunch Version",
      ]);
    });

    it("falls back to relevance/recency order when no meal is given", async () => {
      const results = await searchMealPlanItems("rankable test meal", user.id);
      expect(results.map((result) => result.item.name)).toEqual([
        "Rankable Test Meal Lunch Version",
        "Rankable Test Meal Dinner Version",
      ]);
    });
  });

  describe("public catalog", () => {
    it("returns a public item for a matching query, tagged with source public", async () => {
      const expectedMatch = await db.publicMealItem.findFirst({
        where: { name: "White Chicken Chili" },
      });
      const results = await searchMealPlanItems("white chicken chili", user.id);
      expect(results).toContainEqual({
        source: "public",
        item: { ...expectedMatch!, image: null },
      });
    });

    it("is not filtered by userId -- any user can see it", async () => {
      const results = await searchMealPlanItems("beef stroganoff", user2.id);
      expect(
        results.some(
          (result) =>
            result.source === "public" &&
            result.item.name === "Beef Stroganoff",
        ),
      ).toBe(true);
    });

    it("excludes an incomplete public item (missing calories/water/dry weight)", async () => {
      const results = await searchMealPlanItems("sweet pork", user.id);
      expect(results).toEqual([]);
    });

    it("returns own and public matches together with no cross-table dedup", async () => {
      await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId: user.id,
          name: "White Chicken Chili",
        }),
      });

      const results = await searchMealPlanItems("white chicken chili", user.id);
      expect(
        results.filter((result) => result.item.name === "White Chicken Chili"),
      ).toHaveLength(2);
      expect(results.map((result) => result.source).sort()).toEqual([
        "own",
        "public",
      ]);
    });
  });
});
