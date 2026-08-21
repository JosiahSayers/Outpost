import { app } from "$/server";
import { db } from "$/utils/db";
import { describe, expect, it } from "bun:test";
import supertest from "supertest";
import { getAuthCookies } from "../../helpers/auth";

describe("GET /", () => {
  it("returns matching categories when the query yields results", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories?query=backpack")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({
      categories: [
        {
          id: expect.any(String),
          name: "Backpacks",
          public: true,
        },
      ],
    });
  });

  it("returns a validation error when the query is not present", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories?query=")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=1 characters",
              "minimum": 1,
              "origin": "string",
              "path": [
                "query",
              ],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });
});

describe("GET /suggestions", () => {
  it("suggests a public category matching a keyword in the item name", async () => {
    const response = await supertest(app)
      .get(
        "/api/gear-categories/suggestions?itemName=Big Agnes Copper Spur Tent",
      )
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({
      categories: expect.arrayContaining([
        {
          id: expect.any(String),
          name: "Tents",
          public: true,
        },
      ]),
    });
  });

  it("returns no suggestions when nothing matches", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=Widget")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({ categories: [] });
  });

  it("returns a validation error when itemName is not present", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(400);
    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "too_small",
              "inclusive": true,
              "message": "Too small: expected string to have >=1 characters",
              "minimum": 1,
              "origin": "string",
              "path": [
                "itemName",
              ],
            },
          ],
          "type": "query",
        },
      ]
    `);
  });

  it("also suggests the user's own private category matched by name, without any keyword data", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    const privateCategory = await db.gearCategory.create({
      data: { name: "1P Tent", userId: user!.id },
    });

    const response = await supertest(app)
      .get(
        "/api/gear-categories/suggestions?itemName=Big Agnes Copper Spur Tent",
      )
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: privateCategory.id, name: "1P Tent" }),
      ]),
    );
  });
});
