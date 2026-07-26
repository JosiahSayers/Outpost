import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;
let userId: string;
let tripId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");

  const user = await db.user.findUnique({
    where: { email: "user@test.com" },
  });
  userId = user!.id;

  const trip = await db.trip.create({
    data: make("Trip", { name: "Appalachian Trail", userId }),
  });
  tripId = trip.id;
});

describe("POST /", () => {
  let packingListId: number;

  beforeEach(async () => {
    const packingList = await db.packingList.create({
      data: { name: "My Packing List", userId },
    });
    packingListId = packingList.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .post("/api/trips/does-not-exist/packing-list")
      .send({ packingListId })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the packing list does not exist", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId: 9999999 })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: `Unable to find packing list with id 9999999`,
    });
  });

  it("returns 404 when the packing list belongs to another user", async () => {
    const otherUser = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const otherPackingList = await db.packingList.create({
      data: { name: "Someone Else's List", userId: otherUser!.id },
    });

    await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId: otherPackingList.id })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("assigns the packing list to the trip", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);

    expect(response.body).toEqual({
      tripPackingList: {
        id: expect.any(String),
        tripId,
        packingListId,
        name: expect.any(String),
        sections: [],
      },
    });
  });

  it("persists the assignment to the database", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId })
      .set("Cookie", authCookies)
      .expect(201);

    const dbTripPackingList = await db.tripPackingList.findUnique({
      where: { id: response.body.tripPackingList.id },
    });
    expect(dbTripPackingList?.tripId).toBe(tripId);
    expect(dbTripPackingList?.packingListId).toBe(packingListId);
  });

  it("returns 409 when the trip already has a packing list assigned", async () => {
    await db.tripPackingList.create({
      data: make("TripPackingList", { tripId, packingListId }),
    });

    const response = await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId })
      .set("Cookie", authCookies)
      .expect(409);

    expect(response.body).toEqual({
      error: "Trip already has a packing list assigned",
    });
  });

  it("rejects a missing packingListId", async () => {
    const response = await request(app)
      .post(`/api/trips/${tripId}/packing-list`)
      .send({})
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
                "packingListId",
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
      .post(`/api/trips/${tripId}/packing-list`)
      .send({ packingListId, notAField: true })
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
});

describe("DELETE /:listId", () => {
  let packingListId: number;

  beforeEach(async () => {
    const packingList = await db.packingList.create({
      data: { name: "My Packing List", userId },
    });
    packingListId = packingList.id;

    await db.tripPackingList.create({
      data: make("TripPackingList", { tripId, packingListId }),
    });
  });

  it("requires a valid session", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${packingListId}`)
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .delete(`/api/trips/does-not-exist/packing-list/${packingListId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${packingListId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the trip has no packing list assigned", async () => {
    await db.tripPackingList.deleteMany({ where: { tripId } });

    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${packingListId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the listId does not match the assigned packing list", async () => {
    const otherPackingList = await db.packingList.create({
      data: { name: "Another Packing List", userId },
    });

    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${otherPackingList.id}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("removes the packing list from the trip", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${packingListId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const dbTripPackingList = await db.tripPackingList.findUnique({
      where: { tripId },
    });
    expect(dbTripPackingList).toBeNull();
  });

  it("does not remove the packing list when the owning user check fails", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/${packingListId}`)
      .set("Cookie", user2AuthCookies)
      .expect(403);

    const dbTripPackingList = await db.tripPackingList.findUnique({
      where: { tripId },
    });
    expect(dbTripPackingList).not.toBeNull();
  });

  it("rejects a non-numeric listId", async () => {
    const response = await request(app)
      .delete(`/api/trips/${tripId}/packing-list/not-a-number`)
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
              "message": "Invalid input: expected number, received NaN",
              "path": [
                "listId",
              ],
              "received": "NaN",
            },
          ],
          "type": "params",
        },
      ]
    `);
  });
});
