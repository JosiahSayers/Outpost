import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let tripId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");

  const user = await db.user.findUnique({
    where: { email: "user@test.com" },
  });
  const trip = await db.trip.create({
    data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
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

    expect(response.body).toMatchObject({
      mealPlanDay: {
        dayNumber: 1,
        date: "2026-06-01",
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
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
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
      data: make("MealPlanDay", { tripId, dayNumber: 1, date: null }),
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
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
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
    await db.mealPlanDay.create({
      data: make("MealPlanDay", {
        tripId,
        dayNumber: 1,
        date: new Date("2026-06-01"),
      }),
    });
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
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const otherTrip = await db.trip.create({
      data: make("Trip", { userId: user!.id }),
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

    expect(response.body).toMatchObject({
      mealPlanDay: { dayNumber: 1, date: "2026-06-05" },
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
