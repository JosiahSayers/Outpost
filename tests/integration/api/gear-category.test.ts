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

  it("matches a keyword built from a generic word + a distinctive one only when they appear adjacent", async () => {
    const response = await supertest(app)
      .get(
        "/api/gear-categories/suggestions?itemName=REI Co-op Half Dome 2 Plus",
      )
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body).toEqual({
      categories: expect.arrayContaining([
        expect.objectContaining({ name: "Tents" }),
      ]),
    });
  });

  it("does not suggest a category from the generic half of a keyword phrase appearing alone", async () => {
    const response = await supertest(app)
      .get(
        "/api/gear-categories/suggestions?itemName=Patagonia Half Zip Fleece",
      )
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body.categories).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Tents" })]),
    );
  });

  it("suggests Water Purifiers, not Water Filters, for a purifier-specific product", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=MSR Guardian Purifier")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Water Purifiers" }),
      ]),
    );
    expect(response.body.categories).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Water Filters" }),
      ]),
    );
  });

  it("matches a brand name with and without its apostrophe", async () => {
    // Postgres's tokenizer splits "Arc'teryx" into separate "arc"/"teryx"
    // lexemes but keeps "Arcteryx" as one -- both spellings are common
    // enough to need their own keyword entry (see gear-category-keywords.ts).
    const withApostrophe = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=Arc'teryx Beta AR")
      .set("Cookie", await getAuthCookies())
      .expect(200);
    const withoutApostrophe = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=Arcteryx Beta AR")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    for (const response of [withApostrophe, withoutApostrophe]) {
      expect(response.body.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Rain Gear" }),
        ]),
      );
    }
  });

  it("does not let the shared word 'pack' crowd out a correctly-matched keyword", async () => {
    // Regression guard: "Atom Packs Prospector" correctly matches the "atom
    // packs" keyword for Backpacks, but "Fanny Packs", "Pack Covers", "Pack
    // Liners", and "Pack Organization" all loosely match on the shared word
    // "pack" in their own names too -- without filtering "pack" as a name-
    // match stopword, those four ties crowd Backpacks out of the top 3.
    const response = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=Atom Packs Prospector")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Backpacks" })]),
    );
  });

  it("suggests Chairs for a product that doesn't literally say 'chair'", async () => {
    const response = await supertest(app)
      .get("/api/gear-categories/suggestions?itemName=Helinox Zero")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);
    expect(response.body.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Chairs" })]),
    );
  });
});
