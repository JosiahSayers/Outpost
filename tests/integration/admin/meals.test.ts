import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import type { PublicMealItem } from "../../../generated/prisma/client";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let adminAuthCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  adminAuthCookies = await getAuthCookies("admin@test.com");
});

describe("GET /established-metadata", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/meals/established-metadata").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/meals/established-metadata")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the distinct vendors and brands across all public meal items", async () => {
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "trail_kitchen",
        sourceProductId: "tk-1",
        brand: "Trail Kitchen",
      }),
    });
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "trail_kitchen",
        sourceProductId: "tk-2",
        brand: "Trail Kitchen",
      }),
    });

    const response = await request(app)
      .get("/admin/meals/established-metadata")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect([...response.body.vendors].sort()).toEqual([
      "peak_refuel",
      "trail_kitchen",
    ]);
    expect([...response.body.brands].sort()).toEqual([
      "Peak Refuel",
      "Trail Kitchen",
    ]);
  });
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/meals").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/meals")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the item summary shape for every seeded meal when no filters are given", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.hasMore).toEqual(expect.any(Boolean));
    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: "White Chicken Chili",
          brand: "Peak Refuel",
          calories: 760,
          waterMl: 237,
          dryWeightGrams: 140,
          imageUrl: null,
        }),
      ]),
    );
  });

  it("returns the admin shape, including source fields the summary transformer hides", async () => {
    const seeded = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "trail_kitchen",
        sourceProductId: "tk-admin-shape",
        sourceUrl: "https://example.com/products/tk-admin-shape",
      }),
    });

    const response = await request(app)
      .get("/admin/meals")
      .query({ vendor: ["trail_kitchen"] })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({
        id: seeded.id,
        sourceVendor: "trail_kitchen",
        sourceProductId: "tk-admin-shape",
        sourceUrl: "https://example.com/products/tk-admin-shape",
        sourceImageUrl: seeded.sourceImageUrl,
      }),
    ]);
  });

  it("returns a matching item for a free-text query", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .query({ query: "beef stroganoff" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({ name: "Beef Stroganoff" }),
    ]);
  });

  it("returns an empty result set for a query that matches nothing", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .query({ query: "nonexistent meal xyz" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body).toEqual({ items: [], hasMore: false });
  });

  it("filters by vendor", async () => {
    const otherVendorMeal = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "trail_kitchen",
        sourceProductId: "gv-filter-1",
      }),
    });

    const response = await request(app)
      .get("/admin/meals")
      .query({ vendor: ["trail_kitchen"] })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({ id: otherVendorMeal.id }),
    ]);
  });

  it("filters by brand", async () => {
    const otherBrandMeal = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        brand: "Some Filterable Brand",
        sourceProductId: "gv-filter-2",
      }),
    });

    const response = await request(app)
      .get("/admin/meals")
      .query({ brand: ["Some Filterable Brand"] })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({ id: otherBrandMeal.id }),
    ]);
  });

  it("paginates using take and skip, and reports hasMore", async () => {
    const total = await db.publicMealItem.count();

    const firstPage = await request(app)
      .get("/admin/meals")
      .query({ take: total - 1, skip: 0 })
      .set("Cookie", adminAuthCookies)
      .expect(200);
    expect(firstPage.body.items).toHaveLength(total - 1);
    expect(firstPage.body.hasMore).toBe(true);

    const lastPage = await request(app)
      .get("/admin/meals")
      .query({ take: total - 1, skip: total - 1 })
      .set("Cookie", adminAuthCookies)
      .expect(200);
    expect(lastPage.body.items).toHaveLength(1);
    expect(lastPage.body.hasMore).toBe(false);
  });

  it("rejects a take above the maximum", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .query({ take: 51 })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [expect.objectContaining({ code: "too_big", path: ["take"] })],
      }),
    ]);
  });

  it("rejects a take below the minimum", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .query({ take: 0 })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [
          expect.objectContaining({ code: "too_small", path: ["take"] }),
        ],
      }),
    ]);
  });

  it("rejects unrecognized query params", async () => {
    const response = await request(app)
      .get("/admin/meals")
      .query({ notAParam: "x" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });
});

describe("POST /", () => {
  const validBody = {
    name: "Test Meal Name",
    brand: "Test Brand",
    calories: 500,
    waterMl: 300,
    dryWeightGrams: 120,
    sourceVendor: "test_vendor",
    sourceProductId: "test-product-1",
    sourceUrl: "https://example.com/products/test-product-1",
  };

  it("requires a valid session", async () => {
    await request(app).post("/admin/meals").send(validBody).expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post("/admin/meals")
      .send(validBody)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("creates a meal and returns it", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send(validBody)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      id: expect.any(String),
      name: validBody.name,
      brand: validBody.brand,
      calories: validBody.calories,
      waterMl: validBody.waterMl,
      dryWeightGrams: validBody.dryWeightGrams,
      sourceVendor: validBody.sourceVendor,
      sourceProductId: validBody.sourceProductId,
      sourceUrl: validBody.sourceUrl,
      sourceImageUrl: null,
      imageUrl: null,
    });

    const created = await db.publicMealItem.findUnique({
      where: { id: response.body.id },
    });
    expect(created).toMatchObject({
      name: validBody.name,
      brand: validBody.brand,
      calories: validBody.calories,
      waterMl: validBody.waterMl,
      dryWeightGrams: validBody.dryWeightGrams,
      sourceVendor: validBody.sourceVendor,
      sourceProductId: validBody.sourceProductId,
      sourceUrl: validBody.sourceUrl,
      imageId: null,
    });
  });

  it("creates a meal without an image when sourceImageUrl is omitted", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send(validBody)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.imageUrl).toBeNull();
  });

  it("rejects a missing name", async () => {
    const { name, ...body } = validBody;

    const response = await request(app)
      .post("/admin/meals")
      .send(body)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["name"] })],
      }),
    ]);
  });

  it("rejects a name shorter than 5 characters", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send({ ...validBody, name: "Hi" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [
          expect.objectContaining({ code: "too_small", path: ["name"] }),
        ],
      }),
    ]);
  });

  it("rejects a missing sourceVendor", async () => {
    const { sourceVendor, ...body } = validBody;

    const response = await request(app)
      .post("/admin/meals")
      .send(body)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["sourceVendor"] })],
      }),
    ]);
  });

  it("rejects a missing sourceProductId", async () => {
    const { sourceProductId, ...body } = validBody;

    const response = await request(app)
      .post("/admin/meals")
      .send(body)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["sourceProductId"] })],
      }),
    ]);
  });

  it("rejects a missing sourceUrl", async () => {
    const { sourceUrl, ...body } = validBody;

    const response = await request(app)
      .post("/admin/meals")
      .send(body)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["sourceUrl"] })],
      }),
    ]);
  });

  it("rejects a sourceUrl that is not a valid URL", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send({ ...validBody, sourceUrl: "not-a-url" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["sourceUrl"] })],
      }),
    ]);
  });

  it("rejects a brand longer than 25 characters", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send({ ...validBody, brand: "a".repeat(26) })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "too_big", path: ["brand"] })],
      }),
    ]);
  });

  it("rejects unrecognized fields", async () => {
    const response = await request(app)
      .post("/admin/meals")
      .send({ ...validBody, notAField: true })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });
});

describe("PATCH /:id", () => {
  it("requires a valid session", async () => {
    await request(app)
      .patch("/admin/meals/some-id")
      .send({ name: "Updated Name" })
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .patch("/admin/meals/some-id")
      .send({ name: "Updated Name" })
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a meal id that doesn't exist", async () => {
    await request(app)
      .patch("/admin/meals/does-not-exist")
      .send({ name: "Updated Name" })
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("updates the provided fields and returns the updated summary", async () => {
    const existing = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        name: "Original Name",
        brand: "Original Brand",
        calories: 400,
      }),
    });

    const response = await request(app)
      .patch(`/admin/meals/${existing.id}`)
      .send({ name: "Updated Name", calories: 900 })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: existing.id,
        name: "Updated Name",
        calories: 900,
        brand: "Original Brand",
      }),
    );

    const updated = await db.publicMealItem.findUnique({
      where: { id: existing.id },
    });
    expect(updated).toMatchObject({ name: "Updated Name", calories: 900 });
  });

  it("leaves fields unchanged when the body omits them", async () => {
    const existing = await db.publicMealItem.create({
      data: make("PublicMealItem", {
        name: "Unchanged Name",
        brand: "Unchanged Brand",
        waterMl: 250,
      }),
    });

    await request(app)
      .patch(`/admin/meals/${existing.id}`)
      .send({ calories: 777 })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const updated = await db.publicMealItem.findUnique({
      where: { id: existing.id },
    });
    expect(updated).toMatchObject({
      name: "Unchanged Name",
      brand: "Unchanged Brand",
      waterMl: 250,
      calories: 777,
    });
  });

  it("rejects a name shorter than 5 characters", async () => {
    const existing = await db.publicMealItem.create({
      data: make("PublicMealItem"),
    });

    const response = await request(app)
      .patch(`/admin/meals/${existing.id}`)
      .send({ name: "Hi" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [
          expect.objectContaining({ code: "too_small", path: ["name"] }),
        ],
      }),
    ]);
  });

  it("rejects a sourceUrl that is not a valid URL", async () => {
    const existing = await db.publicMealItem.create({
      data: make("PublicMealItem"),
    });

    const response = await request(app)
      .patch(`/admin/meals/${existing.id}`)
      .send({ sourceUrl: "not-a-url" })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ path: ["sourceUrl"] })],
      }),
    ]);
  });

  it("rejects unrecognized fields", async () => {
    const existing = await db.publicMealItem.create({
      data: make("PublicMealItem"),
    });

    const response = await request(app)
      .patch(`/admin/meals/${existing.id}`)
      .send({ notAField: true })
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "body",
        errors: [expect.objectContaining({ code: "unrecognized_keys" })],
      }),
    ]);
  });
});

describe("DELETE /:id", () => {
  let existing: PublicMealItem;

  beforeEach(async () => {
    existing = await db.publicMealItem.create({
      data: make("PublicMealItem"),
    });
  });

  it("requires a valid session", async () => {
    await request(app).delete(`/admin/meals/${existing.id}`).expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .delete(`/admin/meals/${existing.id}`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a meal id that doesn't exist", async () => {
    await request(app)
      .delete("/admin/meals/does-not-exist")
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("deletes the meal", async () => {
    await request(app)
      .delete(`/admin/meals/${existing.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    const deleted = await db.publicMealItem.findUnique({
      where: { id: existing.id },
    });
    expect(deleted).toBeNull();
  });
});
