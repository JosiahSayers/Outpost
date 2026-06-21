import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");
});

describe("POST /", () => {
  it("returns the new gear item when using an existing category", async () => {
    const existingCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Backpacks" },
    });

    const response = await request(app)
      .post("/api/gear-inventory")
      .send({
        name: "Snazzy Test Backpack",
        quantity: 1,
        existingCategoryId: existingCategory!.id,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toMatchObject({
      item: {
        category: {
          name: "Backpacks",
        },
        name: "Snazzy Test Backpack",
        quantity: 1,
      },
    });
  });

  it("returns the new gear item when using a new category", async () => {
    const response = await request(app)
      .post("/api/gear-inventory")
      .send({
        name: "Snazzy Test Backpack",
        quantity: 1,
        newCategoryName: "Fancy New Category",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(201);
    expect(response.body).toMatchObject({
      item: {
        category: {
          name: "Fancy New Category",
        },
        name: "Snazzy Test Backpack",
        quantity: 1,
      },
    });
  });

  it("returns a validation error when the existing category cannot be found", async () => {
    const response = await request(app)
      .post("/api/gear-inventory")
      .send({
        name: "Snazzy Test Backpack",
        quantity: 1,
        existingCategoryId: -1,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(404);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "error": "Unable to find category",
      }
    `);
  });
});

describe("GET /", () => {
  beforeEach(async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const category = await db.gearCategory.findFirst({
      where: { public: true },
    });
    const user1Items = await db.gearInventoryItem.createMany({
      data: [
        {
          name: "New item 1",
          quantity: 1,
          userId: user!.id,
          gearCategoryId: category!.id,
          grams: 10,
        },
        {
          name: "New item 2",
          quantity: 1,
          userId: user!.id,
          gearCategoryId: category!.id,
        },
      ],
    });
  });

  it("returns the items for the logged in user", async () => {
    const response = await request(app)
      .get("/api/gear-inventory")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);
    const itemNames = response.body.items.map((item: any) => item.name);
    expect(itemNames).toContain("New item 1");
    expect(itemNames).toContain("New item 2");
  });

  it("does not return user 1's items for user 2", async () => {
    const response = await request(app)
      .get("/api/gear-inventory")
      .set("Cookie", user2AuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toMatchInlineSnapshot(`
      {
        "items": [],
      }
    `);
  });
});

describe("DELETE /:id", () => {
  let user1ItemId: number;
  let user2ItemId: number;

  beforeEach(async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const category = await db.gearCategory.findFirst({
      where: { public: true },
    });
    const user1Item = await db.gearInventoryItem.create({
      data: {
        name: "New item 1",
        quantity: 1,
        userId: user!.id,
        gearCategoryId: category!.id,
      },
    });
    user1ItemId = user1Item.id;
    const user2Item = await db.gearInventoryItem.create({
      data: {
        name: "New item 2",
        quantity: 1,
        userId: user2!.id,
        gearCategoryId: category!.id,
      },
    });
    user2ItemId = user2Item.id;
  });

  it("returns a 404 when the id does not belong to the user", async (done) => {
    request(app)
      .delete(`/api/gear-inventory/${user2ItemId!}`)
      .set("Cookie", authCookies)
      .expect(404, done);
  });

  it("returns a 200 when the id belongs to the user", async (done) => {
    request(app)
      .delete(`/api/gear-inventory/${user2ItemId!}`)
      .set("Cookie", user2AuthCookies)
      .expect(200, done);
  });
});
