import { app } from "$/server";
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
    expect(response.body).toMatchInlineSnapshot(`
      {
        "categories": [
          {
            "id": 1,
            "name": "Backpacks",
            "public": true,
          },
        ],
      }
    `);
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
