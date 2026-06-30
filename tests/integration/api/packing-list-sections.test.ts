import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { getAuthCookies } from "../../helpers/auth";
import supertest from "supertest";
import { app } from "$/server";
import { db } from "$/utils/db";

let authCookies: string[];
let packingListId: number;

beforeAll(async () => {
  authCookies = await getAuthCookies();
});

// The database is reset to the seeded baseline after every test, so the packing
// list fixture is recreated per-test rather than once in beforeAll.
beforeEach(async () => {
  const listRes = await supertest(app)
    .post("/api/packing-lists")
    .set("Cookie", authCookies)
    .send({ name: "Section Tests List" })
    .expect(201);
  packingListId = listRes.body.packingList.id;
});

describe("POST /", () => {
  it("requires a valid session", async () => {
    await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .send({ name: "My Section" })
      .expect(401);
  });

  it("returns 404 when the packing list does not exist", async () => {
    await supertest(app)
      .post(`/api/packing-lists/-1/sections`)
      .set("Cookie", authCookies)
      .send({ name: "My Section" })
      .expect(404);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", user2Cookies)
      .send({ name: "My Section" })
      .expect(403);
  });

  it("returns 400 when name is not provided", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", authCookies)
      .send({})
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
      .post(`/api/packing-lists/${packingListId}/sections`)
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

  it("creates a new section and returns 201", async () => {
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", authCookies)
      .send({ name: "My Section", sortPosition: 1 })
      .expect(201);
    expect(body).toEqual({
      section: {
        id: expect.any(Number),
        name: "My Section",
        sortPosition: 1,
      },
    });
  });

  it("returns 400 when a section with the same name already exists", async () => {
    await db.packingListSection.create({
      data: { name: "My Section", packingListId, sortPosition: 1 },
    });
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", authCookies)
      .send({ name: "My Section" })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      {
        "error": ""My Section" is already a section on this packing list",
      }
    `);
  });

  it("returns 400 when sortPosition is not higher than the current highest", async () => {
    await db.packingListSection.create({
      data: { name: "My Section", packingListId, sortPosition: 1 },
    });
    const { body } = await supertest(app)
      .post(`/api/packing-lists/${packingListId}/sections`)
      .set("Cookie", authCookies)
      .send({ name: "Another Section", sortPosition: 1 })
      .expect(400);
    expect(body).toMatchInlineSnapshot(`
      {
        "error": ""sortPosition" should be higher than the current highest sort position. You provided: 1, currentHighest: 1",
      }
    `);
  });
});

describe("DELETE /:sectionId", () => {
  let sectionId: number;

  beforeEach(async () => {
    const section = await db.packingListSection.create({
      data: { name: "Section To Delete", packingListId, sortPosition: 1 },
    });
    sectionId = section.id;
  });

  it("requires a valid session", async () => {
    await supertest(app)
      .delete(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .expect(401);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .delete(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .set("Cookie", user2Cookies)
      .expect(403);
  });

  it("returns 404 when the section does not exist", async () => {
    await supertest(app)
      .delete(`/api/packing-lists/${packingListId}/sections/-1`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("returns 404 when the section belongs to a different packing list", async () => {
    const otherListRes = await supertest(app)
      .post("/api/packing-lists")
      .set("Cookie", authCookies)
      .send({ name: "Other List" })
      .expect(201);
    const otherListId = otherListRes.body.packingList.id;

    await supertest(app)
      .delete(`/api/packing-lists/${otherListId}/sections/${sectionId}`)
      .set("Cookie", authCookies)
      .expect(404);
  });

  it("deletes the section and returns 200", async () => {
    await supertest(app)
      .delete(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .set("Cookie", authCookies)
      .expect(200);

    const deleted = await db.packingListSection.findUnique({
      where: { id: sectionId },
    });
    expect(deleted).toBeNull();
  });
});

describe("PATCH /:sectionId", () => {
  let sectionId: number;

  beforeEach(async () => {
    const section = await db.packingListSection.create({
      data: { name: "Section To Patch", packingListId, sortPosition: 1 },
    });
    sectionId = section.id;
  });

  it("requires a valid session", async () => {
    await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .send({ name: "Updated Name" })
      .expect(401);
  });

  it("returns 403 when the user does not own the packing list", async () => {
    const user2Cookies = await getAuthCookies("user2@test.com");
    await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .set("Cookie", user2Cookies)
      .send({ name: "Updated Name" })
      .expect(403);
  });

  it("returns 404 when the section does not exist", async () => {
    await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/-1`)
      .set("Cookie", authCookies)
      .send({ name: "Updated Name" })
      .expect(404);
  });

  it("returns 400 when name is shorter than 3 characters", async () => {
    const { body } = await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
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

  it("updates the section name and returns the updated section", async () => {
    const { body } = await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/${sectionId}`)
      .set("Cookie", authCookies)
      .send({ name: "Updated Name", sortPosition: 1 })
      .expect(200);
    expect(body).toEqual({
      section: {
        id: sectionId,
        name: "Updated Name",
        sortPosition: 1,
      },
    });
  });

  it("reorders sections when sortPosition moves a section into the middle", async () => {
    const section2 = await db.packingListSection.create({
      data: { name: "Second Section", packingListId, sortPosition: 2 },
    });
    const section3 = await db.packingListSection.create({
      data: { name: "Third Section", packingListId, sortPosition: 3 },
    });

    await supertest(app)
      .patch(`/api/packing-lists/${packingListId}/sections/${section3.id}`)
      .set("Cookie", authCookies)
      .send({ sortPosition: 1 })
      .expect(200);

    const [refreshed1, refreshed2, refreshed3] = await Promise.all([
      db.packingListSection.findUnique({ where: { id: sectionId } }),
      db.packingListSection.findUnique({ where: { id: section2.id } }),
      db.packingListSection.findUnique({ where: { id: section3.id } }),
    ]);

    expect(refreshed1?.sortPosition).toBe(2);
    expect(refreshed2?.sortPosition).toBe(3);
    expect(refreshed3?.sortPosition).toBe(1);
  });
});
