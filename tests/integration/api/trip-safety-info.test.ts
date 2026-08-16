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

describe("PUT /", () => {
  it("requires a valid session", async () => {
    await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "Jane Doe" })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .put("/api/trips/does-not-exist/safety-info")
      .send({ emergencyContactName: "Jane Doe" })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "Jane Doe" })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("creates safety info when none exists", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "555-123-4567",
        rangerStationName: "Ranger HQ",
        rangerStationPhone: "555-000-0000",
        expectedDepartureTime: "08:00",
        expectedReturnTime: "17:00",
        vehicleDescription: "Blue Subaru",
        permitOrRouteNumber: "AT-123",
        medicalNotes: "None",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      safetyInfo: {
        id: expect.any(String),
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "555-123-4567",
        rangerStationName: "Ranger HQ",
        rangerStationPhone: "555-000-0000",
        expectedDepartureTime: "08:00",
        expectedReturnTime: "17:00",
        vehicleDescription: "Blue Subaru",
        permitOrRouteNumber: "AT-123",
        medicalNotes: "None",
      },
    });
  });

  it("persists new safety info to the database, scoped to the trip", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "Jane Doe" })
      .set("Cookie", authCookies)
      .expect(200);

    const dbSafetyInfo = await db.tripSafetyInfo.findUnique({
      where: { id: response.body.safetyInfo.id },
    });
    expect(dbSafetyInfo?.tripId).toBe(tripId);
  });

  it("allows creating safety info with no fields provided", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({})
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.safetyInfo.emergencyContactName).toBeNull();
  });

  it("updates existing safety info", async () => {
    await db.tripSafetyInfo.create({
      data: make("TripSafetyInfo", {
        tripId,
        emergencyContactName: "Jane Doe",
        expectedReturnTime: "17:00",
      }),
    });

    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "John Smith", expectedReturnTime: "18:00" })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.safetyInfo.emergencyContactName).toBe("John Smith");
    expect(response.body.safetyInfo.expectedReturnTime).toBe("18:00");
  });

  it("persists the update to the database rather than creating a duplicate row", async () => {
    const existing = await db.tripSafetyInfo.create({
      data: make("TripSafetyInfo", {
        tripId,
        emergencyContactName: "Jane Doe",
      }),
    });

    await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "John Smith" })
      .set("Cookie", authCookies)
      .expect(200);

    const count = await db.tripSafetyInfo.count({ where: { tripId } });
    expect(count).toBe(1);

    const dbSafetyInfo = await db.tripSafetyInfo.findUnique({
      where: { id: existing.id },
    });
    expect(dbSafetyInfo?.emergencyContactName).toBe("John Smith");
  });

  it("leaves an existing field unchanged when it is omitted from the update", async () => {
    await db.tripSafetyInfo.create({
      data: make("TripSafetyInfo", {
        tripId,
        emergencyContactName: "Jane Doe",
      }),
    });

    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({})
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.safetyInfo.emergencyContactName).toBe("Jane Doe");
  });

  it("trims string fields", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "  Jane Doe  " })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.safetyInfo.emergencyContactName).toBe("Jane Doe");
  });

  it("rejects a field that exceeds the max length", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "a".repeat(51) })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_big",
              "inclusive": true,
              "maximum": 50,
              "message": "Too big: expected string to have <=50 characters",
              "origin": "string",
              "path": [
                "emergencyContactName",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "Jane Doe", notAField: true })
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

  it("does not modify safety info when the owning user check fails", async () => {
    await db.tripSafetyInfo.create({
      data: make("TripSafetyInfo", {
        tripId,
        emergencyContactName: "Jane Doe",
      }),
    });

    await request(app)
      .put(`/api/trips/${tripId}/safety-info`)
      .send({ emergencyContactName: "John Smith" })
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbSafetyInfo = await db.tripSafetyInfo.findUnique({
      where: { tripId },
    });
    expect(dbSafetyInfo?.emergencyContactName).toBe("Jane Doe");
  });
});
