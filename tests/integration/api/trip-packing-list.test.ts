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
  let packingListId: string;

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
      .send({ packingListId: "does-not-exist" })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: `Unable to find packing list with id does-not-exist`,
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
              "expected": "string",
              "message": "Invalid input: expected string, received undefined",
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
  let packingListId: string;

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

  it("returns 404 for a listId that does not match any assigned packing list", async () => {
    await request(app)
      .delete(`/api/trips/${tripId}/packing-list/does-not-exist`)
      .set("Cookie", authCookies)
      .expect(404);
  });
});

describe("PATCH /:listId/:itemId", () => {
  let packingListId: string;
  let tripPackingListId: string;
  let sectionId: string;
  let itemId: string;

  beforeEach(async () => {
    const packingList = await db.packingList.create({
      data: { name: "My Packing List", userId },
    });
    packingListId = packingList.id;

    const tripPackingList = await db.tripPackingList.create({
      data: make("TripPackingList", { tripId, packingListId }),
    });
    tripPackingListId = tripPackingList.id;

    const section = await db.packingListSection.create({
      data: { name: "Shelter", packingListId, sortPosition: 1 },
    });
    sectionId = section.id;

    const item = await db.packingListItem.create({
      data: {
        name: "Tent",
        sortPosition: 1,
        packingListSectionId: sectionId,
      },
    });
    itemId = item.id;
  });

  it("requires a valid session", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true })
      .expect(401);
  });

  it("returns 404 when the trip does not exist", async () => {
    await request(app)
      .patch(
        `/api/trips/does-not-exist/packing-list/${packingListId}/${itemId}`,
      )
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 403 when the trip belongs to another user", async () => {
    await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true })
      .set("Cookie", user2AuthCookies)
      .expect(403);
  });

  it("returns 404 when the trip has no packing list assigned", async () => {
    await db.tripPackingList.deleteMany({ where: { tripId } });

    await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the listId does not match the assigned packing list", async () => {
    const otherPackingList = await db.packingList.create({
      data: { name: "Another Packing List", userId },
    });

    await request(app)
      .patch(
        `/api/trips/${tripId}/packing-list/${otherPackingList.id}/${itemId}`,
      )
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item does not exist", async () => {
    await request(app)
      .patch(
        `/api/trips/${tripId}/packing-list/${packingListId}/does-not-exist`,
      )
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different packing list", async () => {
    const otherPackingList = await db.packingList.create({
      data: { name: "Another Packing List", userId },
    });
    const otherSection = await db.packingListSection.create({
      data: {
        name: "Kitchen",
        packingListId: otherPackingList.id,
        sortPosition: 1,
      },
    });
    const otherItem = await db.packingListItem.create({
      data: {
        name: "Stove",
        sortPosition: 1,
        packingListSectionId: otherSection.id,
      },
    });

    const response = await request(app)
      .patch(
        `/api/trips/${tripId}/packing-list/${packingListId}/${otherItem.id}`,
      )
      .send({ packed: true })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: `Unable to find packing list item (${otherItem.id}) on this packing list (${packingListId})`,
    });

    const dbStatus = await db.tripPackingListItemStatus.findFirst({
      where: { tripPackingListId, packingListItemId: otherItem.id },
    });
    expect(dbStatus).toBeNull();
  });

  it("creates a status when none exists yet", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true, notNeeded: false })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      item: {
        id: itemId,
        name: "Tent",
        optional: false,
        quantity: 1,
        sortPosition: 1,
        assignedGear: null,
        status: {
          packed: true,
          notNeeded: false,
        },
      },
    });

    const dbStatus = await db.tripPackingListItemStatus.findUnique({
      where: {
        tripPackingListId_packingListItemId: {
          tripPackingListId,
          packingListItemId: itemId,
        },
      },
    });
    expect(dbStatus?.packed).toBe(true);
    expect(dbStatus?.notNeeded).toBe(false);
  });

  it("includes the assigned gear when the item has one", async () => {
    const category = (await db.gearCategory.findFirst({
      where: { public: true, name: "Backpacks" },
    }))!;
    const gear = await db.gearInventoryItem.create({
      data: {
        name: "My Backpack",
        quantity: 1,
        grams: 900,
        userId,
        gearCategoryId: category.id,
      },
    });
    const itemWithGear = await db.packingListItem.create({
      data: {
        name: "Backpack Item",
        sortPosition: 2,
        packingListSectionId: sectionId,
        assignedGearId: gear.id,
      },
    });

    const response = await request(app)
      .patch(
        `/api/trips/${tripId}/packing-list/${packingListId}/${itemWithGear.id}`,
      )
      .send({ packed: true, notNeeded: false })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.item.assignedGear).toEqual({
      id: gear.id,
      name: gear.name,
      quantity: gear.quantity,
      grams: gear.grams,
      category: {
        id: category.id,
        name: category.name,
        public: category.public,
      },
    });
  });

  it("updates an existing status", async () => {
    await db.tripPackingListItemStatus.create({
      data: make("TripPackingListItemStatus", {
        tripPackingListId,
        packingListItemId: itemId,
        packed: false,
        notNeeded: false,
      }),
    });

    const response = await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true, notNeeded: true })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.item.status).toEqual({
      packed: true,
      notNeeded: true,
    });

    const statuses = await db.tripPackingListItemStatus.findMany({
      where: { tripPackingListId, packingListItemId: itemId },
    });
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.packed).toBe(true);
    expect(statuses[0]?.notNeeded).toBe(true);
  });

  it("allows a partial update of a single field", async () => {
    await db.tripPackingListItemStatus.create({
      data: make("TripPackingListItemStatus", {
        tripPackingListId,
        packingListItemId: itemId,
        packed: true,
        notNeeded: false,
      }),
    });

    const response = await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ notNeeded: true })
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.item.status).toEqual({
      packed: true,
      notNeeded: true,
    });
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .patch(`/api/trips/${tripId}/packing-list/${packingListId}/${itemId}`)
      .send({ packed: true, notAField: true })
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
