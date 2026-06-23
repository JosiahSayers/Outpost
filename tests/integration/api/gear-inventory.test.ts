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

  it("returns a validation error when the existing category is not accessible to the user", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const nonPublicCategory = await db.gearCategory.create({
      data: {
        name: "My private category",
        userId: user2!.id,
      },
    });

    const response = await request(app)
      .post("/api/gear-inventory")
      .send({
        name: "Snazzy Test Backpack",
        quantity: 1,
        existingCategoryId: nonPublicCategory.id,
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

describe("PUT /:id", () => {
  let user1ItemId: number;
  let user2ItemId: number;
  let backpacksCategoryId: number;

  beforeEach(async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const backpacksCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Backpacks" },
    });
    backpacksCategoryId = backpacksCategory!.id;

    const user1Item = await db.gearInventoryItem.create({
      data: {
        name: "Original Name",
        quantity: 1,
        grams: 100,
        userId: user!.id,
        gearCategoryId: backpacksCategoryId,
      },
    });
    user1ItemId = user1Item.id;

    const user2Item = await db.gearInventoryItem.create({
      data: {
        name: "User 2 Item",
        quantity: 1,
        userId: user2!.id,
        gearCategoryId: backpacksCategoryId,
      },
    });
    user2ItemId = user2Item.id;
  });

  it("updates fields and returns the updated item", async () => {
    const response = await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Updated Name",
        quantity: 3,
        grams: 200,
        existingCategoryId: backpacksCategoryId,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      item: {
        name: "Updated Name",
        quantity: 3,
        grams: 200,
        category: { name: "Backpacks" },
      },
    });

    const dbItem = await db.gearInventoryItem.findUnique({
      where: { id: user1ItemId },
    });
    expect(dbItem).toMatchObject({
      name: "Updated Name",
      quantity: 3,
      grams: 200,
    });
  });

  it("changes to a different existing accessible category", async () => {
    const tentsCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Tents" },
    });

    const response = await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        existingCategoryId: tentsCategory!.id,
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      item: { category: { name: "Tents" } },
    });

    const dbItem = await db.gearInventoryItem.findUnique({
      where: { id: user1ItemId },
      include: { category: true },
    });
    expect(dbItem?.category.id).toBe(tentsCategory!.id);
  });

  it("changes to a new category", async () => {
    const response = await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        newCategoryName: "My Custom Category",
      })
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      item: { category: { name: "My Custom Category" } },
    });

    const dbItem = await db.gearInventoryItem.findUnique({
      where: { id: user1ItemId },
      include: { category: true },
    });
    expect(dbItem?.category.name).toBe("My Custom Category");
  });

  it("deletes the old private category when the item was the sole user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const privateCategory = await db.gearCategory.create({
      data: { name: "My Private Category", userId: user!.id },
    });
    await db.gearInventoryItem.update({
      where: { id: user1ItemId },
      data: { gearCategoryId: privateCategory.id },
    });

    const tentsCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Tents" },
    });

    await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        existingCategoryId: tentsCategory!.id,
      })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      await db.gearCategory.findUnique({ where: { id: privateCategory.id } }),
    ).toBeNull();
  });

  it("does not delete the old category when it is public", async () => {
    const tentsCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Tents" },
    });

    await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        existingCategoryId: tentsCategory!.id,
      })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      await db.gearCategory.findUnique({ where: { id: backpacksCategoryId } }),
    ).not.toBeNull();
  });

  it("does not delete the old private category when other items still reference it", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const privateCategory = await db.gearCategory.create({
      data: { name: "Shared Private Category", userId: user!.id },
    });
    await db.gearInventoryItem.createMany({
      data: [
        {
          name: "Item A",
          quantity: 1,
          userId: user!.id,
          gearCategoryId: privateCategory.id,
        },
        {
          name: "Item B",
          quantity: 1,
          userId: user!.id,
          gearCategoryId: privateCategory.id,
        },
      ],
    });
    await db.gearInventoryItem.update({
      where: { id: user1ItemId },
      data: { gearCategoryId: privateCategory.id },
    });

    const tentsCategory = await db.gearCategory.findFirst({
      where: { public: true, name: "Tents" },
    });

    await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        existingCategoryId: tentsCategory!.id,
      })
      .set("Cookie", authCookies)
      .expect(200);

    expect(
      await db.gearCategory.findUnique({ where: { id: privateCategory.id } }),
    ).not.toBeNull();
  });

  it("returns a 403 when the item belongs to another user", async (done) => {
    request(app)
      .put(`/api/gear-inventory/${user2ItemId}`)
      .send({
        name: "Hacked",
        quantity: 1,
        existingCategoryId: backpacksCategoryId,
      })
      .set("Cookie", authCookies)
      .expect(403, done);
  });

  it("returns a 404 when the item id cannot be found", async (done) => {
    request(app)
      .put(`/api/gear-inventory/-1`)
      .send({
        name: "Ghost Item",
        quantity: 1,
        existingCategoryId: backpacksCategoryId,
      })
      .set("Cookie", authCookies)
      .expect(404, done);
  });

  it("returns a 404 when the existing category is not accessible to the user", async () => {
    const user2 = await db.user.findUnique({
      where: { email: "user2@test.com" },
    });
    const user2PrivateCategory = await db.gearCategory.create({
      data: { name: "User 2 Private Category", userId: user2!.id },
    });

    const response = await request(app)
      .put(`/api/gear-inventory/${user1ItemId}`)
      .send({
        name: "Original Name",
        quantity: 1,
        existingCategoryId: user2PrivateCategory.id,
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

  it("returns a 403 when the id does not belong to the user", async (done) => {
    request(app)
      .delete(`/api/gear-inventory/${user2ItemId!}`)
      .set("Cookie", authCookies)
      .expect(403, done);
  });

  it("returns a 404 when the id cannot be found", async (done) => {
    request(app)
      .delete(`/api/gear-inventory/-1`)
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
