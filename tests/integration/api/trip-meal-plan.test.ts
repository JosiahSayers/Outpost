import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let tripId: string;
let userId: string;
let user2Id: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");

  const user = await db.user.findUnique({
    where: { email: "user@test.com" },
  });
  const user2 = await db.user.findUnique({
    where: { email: "user2@test.com" },
  });
  userId = user!.id;
  user2Id = user2!.id;
  const trip = await db.trip.create({
    data: make("Trip", { name: "Appalachian Trail", userId }),
  });
  tripId = trip.id;
});

describe("POST /days", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/meal-plan/days")
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("creates a day with the provided fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      mealPlanDay: {
        id: expect.any(String),
        dayNumber: 1,
        date: "2026-06-01",
        meals: {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      },
    });
  });

  it("allows creating a day without a date", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1 })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.mealPlanDay.date).toBeNull();
  });

  it("persists the day to the database, scoped to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect(201);

    const dbDay = await db.mealPlanDay.findUnique({
      where: { id: response.body.mealPlanDay.id },
    });
    expect(dbDay?.tripId).toBe(tripId);
  });

  it("rejects a dayNumber less than 1", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 0, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected number to be >=1",
              "minimum": 1,
              "origin": "number",
              "path": [
                "dayNumber",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a missing dayNumber", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "number",
              "message": "Invalid input: expected number, received undefined",
              "path": [
                "dayNumber",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an unparseable date", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "not-a-date" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [
        expect.objectContaining({
          message: "Invalid date",
          path: ["date"],
        }),
      ],
      type: "body",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01", notAField: true })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("returns 400 when a day with the same dayNumber already exists for the trip", async () => {
    await db.mealPlanDay.create({
      data: make("MealPlanDay", { tripId, dayNumber: 1 }),
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "error": "Day 1 already exists for this trip",
      }
    `);
  });

  it("allows the same dayNumber on a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });
    await db.mealPlanDay.create({
      data: make("MealPlanDay", { tripId: otherTrip.id, dayNumber: 1 }),
    });

    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days`)
      .send({ dayNumber: 1, date: "2026-06-01" })
      .set("Cookie", authCookies)
      .expect(201);
  });
});

describe("DELETE /days/:day", () => {
  beforeEach(async () => {
    await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete("/api/trips/does-not-exist/meal-plan/days/1")
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/99`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the day belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/meal-plan/days/1`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the day", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbDay = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
    });
    expect(dbDay).toBeNull();
  });

  it("does not delete the day when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbDay = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
    });
    expect(dbDay).not.toBeNull();
  });
});

describe("PATCH /days/:day", () => {
  beforeEach(async () => {
    const day = await db.mealPlanDay.create({
      data: make("MealPlanDay", {
        tripId,
        dayNumber: 1,
        date: new Date("2026-06-01"),
      }),
    });
    for (const meal of ["breakfast", "lunch", "dinner", "snacks"] as const) {
      const mealPlanItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", { userId }),
      });
      await db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: day.id,
          mealPlanItemId: mealPlanItem.id,
          meal,
        }),
      });
    }
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch("/api/trips/does-not-exist/meal-plan/days/1")
      .send({ date: "2026-06-05" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/99`)
      .send({ date: "2026-06-05" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the day belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .patch(`/api/trips/${otherTrip.id}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("updates the date", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      mealPlanDay: {
        id: expect.any(String),
        dayNumber: 1,
        date: "2026-06-05",
        meals: {
          breakfast: [expect.objectContaining({ meal: "breakfast" })],
          lunch: [expect.objectContaining({ meal: "lunch" })],
          dinner: [expect.objectContaining({ meal: "dinner" })],
          snacks: [expect.objectContaining({ meal: "snacks" })],
        },
      },
    });
  });

  it("persists the update to the database", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbDay = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
    });
    expect(dbDay?.date?.toISOString().slice(0, 10)).toBe("2026-06-05");
  });

  it("allows clearing the date", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: null })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.mealPlanDay.date).toBeNull();
  });

  it("rejects an unparseable date", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "not-a-date" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [
        expect.objectContaining({
          message: "Invalid date",
          path: ["date"],
        }),
      ],
      type: "body",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ notAField: true })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("does not modify the day when the owning user check fails", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1`)
      .send({ date: "2026-06-05" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbDay = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
    });
    expect(dbDay?.date?.toISOString().slice(0, 10)).toBe("2026-06-01");
  });
});

describe("GET /items", () => {
  // A word that doesn't appear anywhere in the seeded meal plan data (which
  // includes several "Instant Oatmeal" etc. rows across the dev seed trips),
  // so matches here are unambiguously the ones this test created.
  const uniqueTerm = "freezedriedtestmeal";
  let itemId: string;
  let dayId: string;

  beforeEach(async () => {
    const day = await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
    dayId = day.id;
    const item = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Freezedriedtestmeal" }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: item.id,
        meal: "breakfast",
      }),
    });
    itemId = item.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .get("/api/trips/does-not-exist/meal-plan/items")
      .query({ query: uniqueTerm })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("rejects a missing query", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [expect.objectContaining({ path: ["query"] })],
      type: "query",
    });
  });

  it("rejects an empty query", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: "" })
      .set("Cookie", authCookies)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [expect.objectContaining({ path: ["query"] })],
      type: "query",
    });
  });

  it("rejects a limit above 50", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, limit: "51" })
      .set("Cookie", authCookies)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [expect.objectContaining({ path: ["limit"] })],
      type: "query",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, notAField: "true" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });

  it("returns matching items", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({ id: itemId, name: "Freezedriedtestmeal" }),
    ]);
  });

  it("returns an empty array when nothing matches", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: "nonexistent-food-xyz" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.items).toEqual([]);
  });

  it("returns items regardless of which trip (or none) they're placed on", async () => {
    // Items are per-user canonical entities now, not trip-scoped -- this one
    // isn't placed on any day at all.
    await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        userId,
        name: "Freezedriedtestmeal Deluxe",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      response.body.items.map((item: { name: string }) => item.name),
    ).toEqual(
      expect.arrayContaining([
        "Freezedriedtestmeal",
        "Freezedriedtestmeal Deluxe",
      ]),
    );
  });

  it("does not return items belonging to another user", async () => {
    await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        userId: user2Id,
        name: "Freezedriedtestmeal User2",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      response.body.items.map((item: { name: string }) => item.name),
    ).not.toContain("Freezedriedtestmeal User2");
  });

  it("respects the limit parameter", async () => {
    await db.mealPlanItem.createMany({
      data: [0, 1, 2].map((i) =>
        make("MealPlanItem", {
          userId,
          name: `Freezedriedtestmeal Variant ${i}`,
        }),
      ),
    });

    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, limit: "2" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.items).toHaveLength(2);
  });

  it("excludes items already placed on the given trip's meal plan when excludeTripId is provided", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, excludeTripId: tripId })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      response.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(itemId);
  });

  it("does not exclude items the user owns but hasn't placed on that trip", async () => {
    const unplaced = await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        userId,
        name: "Freezedriedtestmeal Unplaced",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, excludeTripId: tripId })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      response.body.items.map((item: { id: string }) => item.id),
    ).toContain(unplaced.id);
  });

  it("rejects an invalid meal value", async () => {
    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, meal: "brunch" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "breakfast"|"lunch"|"dinner"|"snacks"",
              "path": [
                "meal",
              ],
              "values": [
                "breakfast",
                "lunch",
                "dinner",
                "snacks",
              ],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });

  it("ranks items matching the given meal above other matches", async () => {
    // The seeded item is placed at breakfast; add a lunch placement too, so
    // a "lunch" search should surface it first despite being created
    // afterward.
    const lunchItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        userId,
        name: "Freezedriedtestmeal Lunch",
      }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: dayId,
        mealPlanItemId: lunchItem.id,
        meal: "lunch",
      }),
    });

    const response = await request(app)
      .get(`/api/trips/${tripId}/meal-plan/items`)
      .query({ query: uniqueTerm, meal: "lunch" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual([
      lunchItem.id,
      itemId,
    ]);
  });

  describe("public catalog", () => {
    it("includes a matching public catalog item tagged with source public", async () => {
      const response = await request(app)
        .get(`/api/trips/${tripId}/meal-plan/items`)
        .query({ query: "white chicken chili" })
        .set("Cookie", authCookies)
        .expect(200);

      expect(response.body.items).toContainEqual(
        expect.objectContaining({
          source: "public",
          name: "White Chicken Chili",
          imageUrl: null,
        }),
      );
    });

    it("excludes an incomplete public catalog item", async () => {
      const response = await request(app)
        .get(`/api/trips/${tripId}/meal-plan/items`)
        .query({ query: "sweet pork" })
        .set("Cookie", authCookies)
        .expect(200);

      expect(response.body.items).toEqual([]);
    });
  });
});

describe("POST /days/:day/items", () => {
  beforeEach(async () => {
    await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
  });

  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/meal-plan/days/1/items")
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/99/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the day belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .post(`/api/trips/${otherTrip.id}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("creates a new item and attaches it with the provided fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({
        mode: "new",
        name: "Oatmeal",
        brand: "Quaker",
        meal: "breakfast",
        calories: 350,
        quantity: 2,
        waterMl: 250,
        dryWeightGrams: 100,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      mealPlanItem: {
        id: expect.any(String),
        mealPlanItemId: expect.any(String),
        name: "Oatmeal",
        brand: "Quaker",
        meal: "breakfast",
        calories: 350,
        quantity: 2,
        waterMl: 250,
        dryWeightGrams: 100,
        status: { purchased: false, packed: false },
      },
    });
  });

  it("defaults calories to 0 and leaves optional fields unset", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect(201);

    expect(response.body.mealPlanItem).toEqual({
      id: expect.any(String),
      mealPlanItemId: expect.any(String),
      name: "Oatmeal",
      brand: null,
      meal: "breakfast",
      calories: 0,
      quantity: 1,
      waterMl: null,
      dryWeightGrams: null,
      status: { purchased: false, packed: false },
    });
  });

  it("persists the item to the database, scoped to the day", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect(201);

    const day = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
    });
    const dbDayItem = await db.mealPlanDayItem.findUnique({
      where: { id: response.body.mealPlanItem.id },
    });
    expect(dbDayItem?.mealPlanDayId).toBe(day!.id);
  });

  it("rejects a missing name", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", meal: "breakfast" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [expect.objectContaining({ path: ["name"] })],
      type: "body",
    });
  });

  it("rejects an invalid meal", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "brunch" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [
        expect.objectContaining({
          path: ["meal"],
        }),
      ],
      type: "body",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({
        mode: "new",
        name: "Oatmeal",
        meal: "breakfast",
        notAField: true,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [expect.objectContaining({ path: [] })],
      type: "body",
    });
  });

  it("does not create the item when the owning user check fails", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
      .send({ mode: "new", name: "Oatmeal", meal: "breakfast" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const day = await db.mealPlanDay.findUnique({
      where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
      include: { items: true },
    });
    expect(day?.items).toEqual([]);
  });

  describe("mode: existing", () => {
    it("attaches an existing item owned by the user", async () => {
      const mealPlanItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", {
          userId,
          name: "Trail Mix",
          calories: 240,
        }),
      });

      const response = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send({
          mode: "existing",
          mealPlanItemId: mealPlanItem.id,
          meal: "snacks",
          quantity: 1,
        })
        .set("Cookie", authCookies)
        .expect(201);

      expect(response.body).toEqual({
        mealPlanItem: {
          id: expect.any(String),
          mealPlanItemId: mealPlanItem.id,
          name: "Trail Mix",
          brand: null,
          meal: "snacks",
          calories: 240,
          quantity: 1,
          waterMl: null,
          dryWeightGrams: null,
          status: { purchased: false, packed: false },
        },
      });
    });

    it("returns 404 when the item belongs to another user", async () => {
      const otherUsersItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", { userId: user2Id, name: "Trail Mix" }),
      });

      await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send({
          mode: "existing",
          mealPlanItemId: otherUsersItem.id,
          meal: "snacks",
        })
        .set("Cookie", authCookies)
        .expect(404);
    });

    it("bumps the quantity instead of duplicating when the item is already in that day+meal slot", async () => {
      const mealPlanItem = await db.mealPlanItem.create({
        data: make("MealPlanItem", { userId, name: "Trail Mix" }),
      });
      const body = {
        mode: "existing" as const,
        mealPlanItemId: mealPlanItem.id,
        meal: "snacks" as const,
        quantity: 1,
      };

      await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send(body)
        .set("Cookie", authCookies)
        .expect(201);

      const second = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send(body)
        .set("Cookie", authCookies)
        .expect(201);

      expect(second.body.mealPlanItem.quantity).toBe(2);

      const day = await db.mealPlanDay.findUnique({
        where: { tripId_dayNumber: { tripId, dayNumber: 1 } },
      });
      const placements = await db.mealPlanDayItem.findMany({
        where: { mealPlanDayId: day!.id, mealPlanItemId: mealPlanItem.id },
      });
      expect(placements).toHaveLength(1);
    });
  });

  describe("mode: public", () => {
    it("forks the public item into a new user-owned MealPlanItem", async () => {
      const publicItem = await db.publicMealItem.findFirstOrThrow({
        where: { name: "White Chicken Chili" },
      });

      const response = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send({
          mode: "public",
          publicMealItemId: publicItem.id,
          meal: "breakfast",
        })
        .set("Cookie", authCookies)
        .expect(201);

      expect(response.body.mealPlanItem).toEqual({
        id: expect.any(String),
        mealPlanItemId: expect.any(String),
        name: publicItem.name,
        brand: publicItem.brand,
        meal: "breakfast",
        calories: publicItem.calories,
        quantity: 1,
        waterMl: publicItem.waterMl,
        dryWeightGrams: publicItem.dryWeightGrams,
        status: { purchased: false, packed: false },
      });

      const forked = await db.mealPlanItem.findUnique({
        where: { id: response.body.mealPlanItem.mealPlanItemId },
      });
      expect(forked).toMatchObject({
        userId,
        publicMealSourceId: publicItem.id,
        name: publicItem.name,
      });
    });

    it("returns 404 when the public meal item does not exist", async () => {
      await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send({
          mode: "public",
          publicMealItemId: "does-not-exist",
          meal: "breakfast",
        })
        .set("Cookie", authCookies)
        .expect(404);
    });

    it("reuses the existing fork instead of duplicating it when the same public item is added again", async () => {
      const publicItem = await db.publicMealItem.findFirstOrThrow({
        where: { name: "White Chicken Chili" },
      });
      const body = {
        mode: "public" as const,
        publicMealItemId: publicItem.id,
        meal: "breakfast" as const,
      };

      const first = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send(body)
        .set("Cookie", authCookies)
        .expect(201);

      const second = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send(body)
        .set("Cookie", authCookies)
        .expect(201);

      expect(second.body.mealPlanItem.mealPlanItemId).toBe(
        first.body.mealPlanItem.mealPlanItemId,
      );
      expect(second.body.mealPlanItem.quantity).toBe(2);

      const forks = await db.mealPlanItem.findMany({
        where: { userId, publicMealSourceId: publicItem.id },
      });
      expect(forks).toHaveLength(1);
    });

    it("keeps a since-edited fork's fields on re-add instead of overwriting them", async () => {
      const publicItem = await db.publicMealItem.findFirstOrThrow({
        where: { name: "White Chicken Chili" },
      });
      const body = {
        mode: "public" as const,
        publicMealItemId: publicItem.id,
        meal: "breakfast" as const,
      };

      const first = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send(body)
        .set("Cookie", authCookies)
        .expect(201);

      await db.mealPlanItem.update({
        where: { id: first.body.mealPlanItem.mealPlanItemId },
        data: { name: "White Chicken Chili (extra spicy)" },
      });

      const second = await request(app)
        .post(`/api/trips/${tripId}/meal-plan/days/1/items`)
        .send({ ...body, meal: "lunch" as const })
        .set("Cookie", authCookies)
        .expect(201);

      expect(second.body.mealPlanItem.name).toBe(
        "White Chicken Chili (extra spicy)",
      );
    });
  });
});

describe("PATCH /days/:day/items/:itemId", () => {
  let itemId: string;
  let mealPlanItemId: string;
  let dayId: string;

  beforeEach(async () => {
    const day = await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
    dayId = day.id;
    const mealPlanItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Oatmeal", calories: 350 }),
    });
    mealPlanItemId = mealPlanItem.id;
    const dayItem = await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: mealPlanItem.id,
        meal: "breakfast",
        quantity: 1,
      }),
    });
    itemId = dayItem.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch(`/api/trips/does-not-exist/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/99/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/does-not-exist`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .patch(`/api/trips/${otherTrip.id}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different day on the same trip", async () => {
    await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 2 }), date: null },
    });

    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/2/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("updates the item with the provided fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({
        name: "Granola",
        brand: "Bear Naked",
        meal: "snacks",
        calories: 200,
        quantity: 3,
        waterMl: 100,
        dryWeightGrams: 50,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      mealPlanItem: {
        id: itemId,
        mealPlanItemId,
        name: "Granola",
        brand: "Bear Naked",
        meal: "snacks",
        calories: 200,
        quantity: 3,
        waterMl: 100,
        dryWeightGrams: 50,
        status: { purchased: false, packed: false },
      },
    });
  });

  it("allows a partial update, leaving other fields unchanged", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body).toEqual({
      mealPlanItem: {
        id: itemId,
        mealPlanItemId,
        name: "Granola",
        brand: null,
        meal: "breakfast",
        calories: 350,
        quantity: 1,
        waterMl: null,
        dryWeightGrams: null,
        status: { purchased: false, packed: false },
      },
    });
  });

  it("persists the update to the database", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbItem = await db.mealPlanItem.findUnique({
      where: { id: mealPlanItemId },
    });
    expect(dbItem?.name).toBe("Granola");
  });

  it("allows clearing waterMl and dryWeightGrams with null", async () => {
    await db.mealPlanItem.update({
      where: { id: mealPlanItemId },
      data: { waterMl: 100, dryWeightGrams: 50 },
    });

    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ waterMl: null, dryWeightGrams: null })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.mealPlanItem).toMatchObject({
      waterMl: null,
      dryWeightGrams: null,
    });
  });

  it("rejects an invalid meal", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ meal: "brunch" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [
        expect.objectContaining({
          path: ["meal"],
        }),
      ],
      type: "body",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ notAField: true })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("does not modify the item when the owning user check fails", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .send({ name: "Granola" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbItem = await db.mealPlanItem.findUnique({
      where: { id: mealPlanItemId },
    });
    expect(dbItem?.name).toBe("Oatmeal");
  });

  describe("ripple and fork", () => {
    async function addSecondPlacement() {
      const day2 = await db.mealPlanDay.create({
        data: { ...make("MealPlanDay", { tripId, dayNumber: 2 }), date: null },
      });
      return db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: day2.id,
          mealPlanItemId,
          meal: "lunch",
        }),
      });
    }

    it("ripples an edit to every placement of the item by default", async () => {
      const otherPlacement = await addSecondPlacement();

      await request(app)
        .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
        .send({ name: "Ripple Test" })
        .set("Cookie", authCookies)
        .expect(200);

      const dbOtherPlacement = await db.mealPlanDayItem.findUnique({
        where: { id: otherPlacement.id },
        include: { mealPlanItem: true },
      });
      expect(dbOtherPlacement?.mealPlanItem.name).toBe("Ripple Test");
    });

    it("forks a new item when fork is true, leaving other placements untouched", async () => {
      const otherPlacement = await addSecondPlacement();

      const response = await request(app)
        .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
        .send({ name: "Forked Name", fork: true })
        .set("Cookie", authCookies)
        .expect(200);

      expect(response.body.mealPlanItem.mealPlanItemId).not.toBe(
        mealPlanItemId,
      );
      expect(response.body.mealPlanItem.name).toBe("Forked Name");

      const originalItem = await db.mealPlanItem.findUnique({
        where: { id: mealPlanItemId },
      });
      expect(originalItem?.name).toBe("Oatmeal");

      const dbOtherPlacement = await db.mealPlanDayItem.findUnique({
        where: { id: otherPlacement.id },
        include: { mealPlanItem: true },
      });
      expect(dbOtherPlacement?.mealPlanItem.name).toBe("Oatmeal");
    });

    it("returns 409 when changing meal to a slot already occupied by another placement of the same item", async () => {
      await db.mealPlanDayItem.create({
        data: make("MealPlanDayItem", {
          mealPlanDayId: dayId,
          mealPlanItemId,
          meal: "lunch",
        }),
      });

      await request(app)
        .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
        .send({ meal: "lunch" })
        .set("Cookie", authCookies)
        .expect(409);
    });
  });
});

describe("DELETE /days/:day/items/:itemId", () => {
  let itemId: string;
  let mealPlanItemId: string;

  beforeEach(async () => {
    const day = await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
    const mealPlanItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Oatmeal" }),
    });
    mealPlanItemId = mealPlanItem.id;
    const dayItem = await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: mealPlanItem.id,
        meal: "breakfast",
      }),
    });
    itemId = dayItem.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/meal-plan/days/1/items/${itemId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/99/items/${itemId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item does not exist", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1/items/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .delete(`/api/trips/${otherTrip.id}/meal-plan/days/1/items/${itemId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different day on the same trip", async () => {
    await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 2 }), date: null },
    });

    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/2/items/${itemId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the placement but keeps the canonical item", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbDayItem = await db.mealPlanDayItem.findUnique({
      where: { id: itemId },
    });
    expect(dbDayItem).toBeNull();

    const dbItem = await db.mealPlanItem.findUnique({
      where: { id: mealPlanItemId },
    });
    expect(dbItem).not.toBeNull();
  });

  it("does not delete the placement when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbDayItem = await db.mealPlanDayItem.findUnique({
      where: { id: itemId },
    });
    expect(dbDayItem).not.toBeNull();
  });
});

describe("PATCH /days/:day/items/:itemId/status", () => {
  let itemId: string;
  let expectedItem: Record<string, unknown>;

  beforeEach(async () => {
    const day = await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 1 }), date: null },
    });
    const mealPlanItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", {
        userId,
        name: "Oatmeal",
        calories: 300,
        waterMl: 200,
        dryWeightGrams: 50,
      }),
    });
    const dayItem = await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: mealPlanItem.id,
        meal: "breakfast",
        quantity: 2,
      }),
    });
    itemId = dayItem.id;
    expectedItem = {
      id: dayItem.id,
      mealPlanItemId: mealPlanItem.id,
      name: mealPlanItem.name,
      brand: mealPlanItem.brand,
      meal: dayItem.meal,
      calories: mealPlanItem.calories,
      quantity: dayItem.quantity,
      waterMl: mealPlanItem.waterMl,
      dryWeightGrams: mealPlanItem.dryWeightGrams,
    };
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch(
        `/api/trips/does-not-exist/meal-plan/days/1/items/${itemId}/status`,
      )
      .send({ purchased: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the day does not exist", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/99/items/${itemId}/status`)
      .send({ purchased: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item does not exist", async () => {
    await request(app)
      .patch(
        `/api/trips/${tripId}/meal-plan/days/1/items/does-not-exist/status`,
      )
      .send({ purchased: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different trip", async () => {
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId }),
    });

    await request(app)
      .patch(
        `/api/trips/${otherTrip.id}/meal-plan/days/1/items/${itemId}/status`,
      )
      .send({ purchased: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different day on the same trip", async () => {
    await db.mealPlanDay.create({
      data: { ...make("MealPlanDay", { tripId, dayNumber: 2 }), date: null },
    });

    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/2/items/${itemId}/status`)
      .send({ purchased: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("updates the purchased/packed status", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true, packed: false })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      item: {
        ...expectedItem,
        status: { purchased: true, packed: false },
      },
    });
  });

  it("persists the status to the database", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true, packed: false })
      .set("Cookie", authCookies)
      .expect(200);

    const dbDayItem = await db.mealPlanDayItem.findUnique({
      where: { id: itemId },
    });
    expect(dbDayItem).toMatchObject({ purchased: true, packed: false });
  });

  it("allows a partial update, leaving the other status field unchanged", async () => {
    await db.mealPlanDayItem.update({
      where: { id: itemId },
      data: { purchased: true, packed: false },
    });

    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body).toEqual({
      item: {
        ...expectedItem,
        status: { purchased: true, packed: true },
      },
    });
  });

  it("rejects a non-boolean purchased value", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: "yes" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body[0]).toMatchObject({
      errors: [
        expect.objectContaining({
          path: ["purchased"],
        }),
      ],
      type: "body",
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true, notAField: true })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "unrecognized_keys",
              "keys": [
                "notAField",
              ],
              "message": "Unrecognized key: "notAField"",
              "path": [],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("does not modify the status when the owning user check fails", async () => {
    await db.mealPlanDayItem.update({
      where: { id: itemId },
      data: { purchased: false, packed: false },
    });

    await request(app)
      .patch(`/api/trips/${tripId}/meal-plan/days/1/items/${itemId}/status`)
      .send({ purchased: true, packed: true })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbDayItem = await db.mealPlanDayItem.findUnique({
      where: { id: itemId },
    });
    expect(dbDayItem).toMatchObject({ purchased: false, packed: false });
  });
});
