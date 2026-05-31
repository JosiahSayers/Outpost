import { app } from "$/server";
import { db } from "$/utils/db";
import { describe, it, expect, beforeEach } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";

let authCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
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
    const user2AuthCookies = await getAuthCookies("user2@test.com");
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
