import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getAuthCookies } from "../../helpers/auth";
import supertest from "supertest";
import { app } from "$/server";
import { db } from "$/utils/db";

let authCookies: string[];
let packingListId: string;
let sectionId: string;

beforeAll(async () => {
  authCookies = await getAuthCookies();
});

async function createGearItem(
  userId: string,
  overrides: { name?: string; quantity?: number; grams?: number | null } = {},
) {
  const category = await db.gearCategory.findFirst({
    where: { public: true, name: "Backpacks" },
  });
  return db.gearInventoryItem.create({
    data: {
      name: "My Backpack",
      quantity: 1,
      grams: 900,
      ...overrides,
      userId,
      gearCategoryId: category!.id,
    },
    include: { category: true },
  });
}

// The database is reset to the seeded baseline after every test, so the list
// and section fixtures are recreated per-test rather than once in beforeAll.
beforeEach(async () => {
  const listRes = await supertest(app)
    .post("/api/packing-lists")
    .set("Cookie", authCookies)
    .send({ name: "Section Items Test List" })
    .expect(201);
  packingListId = listRes.body.packingList.id;

  const sectionRes = await supertest(app)
    .post(`/api/packing-lists/${packingListId}/sections`)
    .set("Cookie", authCookies)
    .send({ name: "Test Section" })
    .expect(201);
  sectionId = sectionRes.body.section.id;
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .send({ name: "My Item", quantity: 1 })
      .expect(401);
  });

  it("returns 404 when the packing list does not exist", async () => {
    await supertest(app)
      .post(`/api/packing-lists/-1/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "My Item", quantity: 1 })
      .expect(404);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", user2Cookies)
      .send({ name: "My Item", quantity: 1 })
      .expect(403);
  });

  it("returns 400 when name is not provided", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ quantity: 1 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "string",
              "message": "Invalid input: expected string, received undefined",
              "path": [
                "name",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("returns 400 when name is shorter than 3 characters", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "ab", quantity: 1 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=3 characters",
              "minimum": 3,
              "origin": "string",
              "path": [
                "name",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("returns 400 when quantity is not provided", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "My Item" })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "number",
              "message": "Invalid input: expected number, received undefined",
              "path": [
                "quantity",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("creates a new item and returns 201", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "My Item", quantity: 2, sortPosition: 1 })
      .expect(201);
    expect(body).toEqual({
      item: {
        id: expect.any(String),
        name: "My Item",
        quantity: 2,
        optional: false,
        sortPosition: 1,
        assignedGear: null,
      },
    });
  });

  it("persists the optional flag when creating an item", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "Optional Item", quantity: 1, optional: true })
      .expect(201);
    expect(body.item.optional).toBe(true);
  });

  it("returns 400 when an item with the same name already exists in the section", async () => {
    await db.packingListItem.create({
      data: {
        name: "My Item",
        packingListSectionId: sectionId,
        sortPosition: 1,
      },
    });
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "My Item", quantity: 1 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      {
        "error": ""My Item" is already an item in this section",
      }
    `);
  });

  it("returns 400 when sortPosition is not higher than the current highest", async () => {
    await db.packingListItem.create({
      data: {
        name: "My Item",
        packingListSectionId: sectionId,
        sortPosition: 1,
      },
    });
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "Another Item", quantity: 1, sortPosition: 1 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      {
        "error": ""sortPosition" should be higher than the current highest sort position. You provided: 1, currentHighest: 1",
      }
    `);
  });

  it("returns 404 when the section belongs to a packing list the user doesn't own", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    const otherListRes = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", user2Cookies)
      .send({ name: "User2's List" })
      .expect(201);
    const otherListId = otherListRes.body.packingList.id;

    const otherSectionRes = await supertest(app)
      .post(`/api/packing-lists/${otherListId}/sections`)
      .set("Cookie", user2Cookies)
      .send({ name: "User2's Section" })
      .expect(201);
    const otherSectionId = otherSectionRes.body.section.id;

    // Authenticated as the owner of `packingListId`, but targeting a section
    // that belongs to user2's packing list instead.
    await supertest(app)
      .post(
        `/api/packing-lists/${packingListId}/sections/${otherSectionId}/items`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Injected Item", quantity: 1 })
      .expect(404);

    const items = await db.packingListItem.findMany({
      where: { packingListSectionId: otherSectionId },
    });
    expect(items).toHaveLength(0);
  });

  it("returns 404 when assignedGearId belongs to a different user", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const otherUsersGear = await createGearItem(user2!.id);

    await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({
        name: "My Item",
        quantity: 1,
        assignedGearId: otherUsersGear.id,
      })
      .expect(404);

    const items = await db.packingListItem.findMany({
      where: { packingListSectionId: sectionId },
    });
    expect(items).toHaveLength(0);
  });

  it("creates an item with the assigned gear and returns its transformed shape", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const gear = await createGearItem(user!.id);

    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections/${sectionId}/items`)
      .set("Cookie", authCookies)
      .send({ name: "My Item", quantity: 1, assignedGearId: gear.id })
      .expect(201);

    expect(body).toEqual({
      item: {
        id: expect.any(String),
        name: "My Item",
        quantity: 1,
        optional: false,
        sortPosition: 1,
        assignedGear: {
          id: gear.id,
          name: gear.name,
          quantity: gear.quantity,
          grams: gear.grams,
          category: {
            id: gear.category.id,
            name: gear.category.name,
            public: gear.category.public,
          },
        },
      },
    });
  });
});

describe("DELETE /:itemId", () => {
  let itemId: string;

  beforeEach(async () => {
    const item = await db.packingListItem.create({
      data: {
        name: "Item To Delete",
        packingListSectionId: sectionId,
        sortPosition: 1,
      },
    });
    itemId = item.id;
  });

  it("requires a valid session", async () => {
    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .expect(401);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", user2Cookies)
      .expect(403);
  });

  it("returns 404 when the item does not exist", async () => {
    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/-1`,
      )
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the item belongs to a different section", async () => {
    const otherSectionRes = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", authCookies)
      .send({ name: "Other Section" })
      .expect(201);
    const otherSectionId = otherSectionRes.body.section.id;

    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${otherSectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the item and returns 200", async () => {
    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .expect(200);

    const deleted = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(deleted).toBeNull();
  });

  it("returns 404 when the section belongs to a packing list the user doesn't own", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    const otherListRes = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", user2Cookies)
      .send({ name: "User2's List" })
      .expect(201);
    const otherListId = otherListRes.body.packingList.id;

    const otherSectionRes = await supertest(app)
      .post(`/api/packing-lists/${otherListId}/sections`)
      .set("Cookie", user2Cookies)
      .send({ name: "User2's Section" })
      .expect(201);
    const otherSectionId = otherSectionRes.body.section.id;

    const otherItem = await db.packingListItem.create({
      data: {
        name: "User2's Item",
        packingListSectionId: otherSectionId,
        sortPosition: 1,
      },
    });

    // Authenticated as the owner of `packingListId`, but targeting a section
    // and item that belong to user2's packing list instead.
    await supertest(app)
      .delete(
        `/api/packing-lists/${packingListId}/sections/${otherSectionId}/items/${otherItem.id}`,
      )
      .set("Cookie", authCookies)
      .expect(404);

    const stillExists = await db.packingListItem.findUnique({
      where: { id: otherItem.id },
    });
    expect(stillExists).not.toBeNull();
  });
});

describe("PATCH /:itemId", () => {
  let itemId: string;

  beforeEach(async () => {
    const item = await db.packingListItem.create({
      data: {
        name: "Item To Patch",
        sortPosition: 1,
        packingListSectionId: sectionId,
      },
    });
    itemId = item.id;
  });

  it("requires a valid session", async () => {
    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .send({ name: "Updated Name" })
      .expect(401);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", user2Cookies)
      .send({ name: "Updated Name" })
      .expect(403);
  });

  it("returns 404 when the item does not exist", async () => {
    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/-1`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Updated Name" })
      .expect(404);
  });

  it("returns 400 when name is shorter than 3 characters", async () => {
    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ name: "ab" })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=3 characters",
              "minimum": 3,
              "origin": "string",
              "path": [
                "name",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("returns 400 when quantity is less than 1", async () => {
    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ quantity: 0 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
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
                "quantity",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("updates the item name and returns the updated item", async () => {
    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Updated Name", sortPosition: 1 })
      .expect(200);
    expect(body).toEqual({
      item: {
        id: itemId,
        name: "Updated Name",
        quantity: expect.any(Number),
        optional: expect.any(Boolean),
        sortPosition: 1,
        assignedGear: null,
      },
    });
  });

  it("updates the item quantity and returns the updated item", async () => {
    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ quantity: 5, sortPosition: 1 })
      .expect(200);
    expect(body.item.quantity).toBe(5);
  });

  it("updates the optional flag and returns the updated item", async () => {
    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ optional: true, sortPosition: 1 })
      .expect(200);
    expect(body.item.optional).toBe(true);
  });

  it("reorders items when sortPosition moves an item into the middle", async () => {
    const item2 = await db.packingListItem.create({
      data: {
        name: "Second Item",
        sortPosition: 2,
        packingListSectionId: sectionId,
      },
    });
    const item3 = await db.packingListItem.create({
      data: {
        name: "Third Item",
        sortPosition: 3,
        packingListSectionId: sectionId,
      },
    });

    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${item3.id}`,
      )
      .set("Cookie", authCookies)
      .send({ sortPosition: 1 })
      .expect(200);

    const [refreshed1, refreshed2, refreshed3] = await Promise.all([
      db.packingListItem.findUnique({ where: { id: itemId } }),
      db.packingListItem.findUnique({ where: { id: item2.id } }),
      db.packingListItem.findUnique({ where: { id: item3.id } }),
    ]);

    expect(refreshed1?.sortPosition).toBe(2);
    expect(refreshed2?.sortPosition).toBe(3);
    expect(refreshed3?.sortPosition).toBe(1);
  });

  it("returns 404 when the section belongs to a packing list the user doesn't own", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    const otherListRes = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", user2Cookies)
      .send({ name: "User2's List" })
      .expect(201);
    const otherListId = otherListRes.body.packingList.id;

    const otherSectionRes = await supertest(app)
      .post(`/api/packing-lists/${otherListId}/sections`)
      .set("Cookie", user2Cookies)
      .send({ name: "User2's Section" })
      .expect(201);
    const otherSectionId = otherSectionRes.body.section.id;

    const otherItem = await db.packingListItem.create({
      data: {
        name: "User2's Item",
        packingListSectionId: otherSectionId,
        sortPosition: 1,
      },
    });

    // Authenticated as the owner of `packingListId`, but targeting a section
    // and item that belong to user2's packing list instead.
    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${otherSectionId}/items/${otherItem.id}`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Tampered Name", sortPosition: 1 })
      .expect(404);

    const unchanged = await db.packingListItem.findUnique({
      where: { id: otherItem.id },
    });
    expect(unchanged?.name).toBe("User2's Item");
  });

  it("returns 404 when assignedGearId belongs to a different user", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const otherUsersGear = await createGearItem(user2!.id);

    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ assignedGearId: otherUsersGear.id, sortPosition: 1 })
      .expect(404);

    const unchanged = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(unchanged?.assignedGearId).toBeNull();
  });

  it("updates the assigned gear and returns the updated item", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const gear = await createGearItem(user!.id);

    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ assignedGearId: gear.id, sortPosition: 1 })
      .expect(200);

    expect(body.item.assignedGear).toEqual({
      id: gear.id,
      name: gear.name,
      quantity: gear.quantity,
      grams: gear.grams,
      category: {
        id: gear.category.id,
        name: gear.category.name,
        public: gear.category.public,
      },
    });
  });

  it("clears the assigned gear when assignedGearId is null", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const gear = await createGearItem(user!.id);

    await db.packingListItem.update({
      where: { id: itemId },
      data: { assignedGearId: gear.id },
    });

    const { body } = await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ assignedGearId: null, sortPosition: 1 })
      .expect(200);

    expect(body.item.assignedGear).toBeNull();

    const unassigned = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(unassigned?.assignedGearId).toBeNull();
  });

  it("leaves the assigned gear unchanged when assignedGearId is omitted", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const gear = await createGearItem(user!.id);

    await db.packingListItem.update({
      where: { id: itemId },
      data: { assignedGearId: gear.id },
    });

    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Renamed", sortPosition: 1 })
      .expect(200);

    const unchanged = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(unchanged?.assignedGearId).toBe(gear.id);
  });

  it("defaults trackGearAssignment to true for newly created items", async () => {
    const created = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(created?.trackGearAssignment).toBe(true);
  });

  it("disables trackGearAssignment and persists it", async () => {
    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ trackGearAssignment: false, sortPosition: 1 })
      .expect(200);

    const updated = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(updated?.trackGearAssignment).toBe(false);
  });

  it("re-enables trackGearAssignment and persists it", async () => {
    await db.packingListItem.update({
      where: { id: itemId },
      data: { trackGearAssignment: false },
    });

    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ trackGearAssignment: true, sortPosition: 1 })
      .expect(200);

    const updated = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(updated?.trackGearAssignment).toBe(true);
  });

  it("leaves trackGearAssignment unchanged when omitted", async () => {
    await db.packingListItem.update({
      where: { id: itemId },
      data: { trackGearAssignment: false },
    });

    await supertest(app)
      .patch(
        `/api/packing-lists/${packingListId}/sections/${sectionId}/items/${itemId}`,
      )
      .set("Cookie", authCookies)
      .send({ name: "Renamed", sortPosition: 1 })
      .expect(200);

    const unchanged = await db.packingListItem.findUnique({
      where: { id: itemId },
    });
    expect(unchanged?.trackGearAssignment).toBe(false);
  });
});
