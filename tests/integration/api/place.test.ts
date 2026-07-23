import { app } from "$/server";
import { db } from "$/utils/db";
import { describe, expect, it } from "bun:test";
import supertest from "supertest";
import { getAuthCookies } from "../../helpers/auth";

describe("GET /api/places", () => {
  it("returns 401 without a valid session", async () => {
    await supertest(app).get("/api/places?query=zephyr").expect(401);
  });

  it("returns matching places for a prefix query", async () => {
    const place = await db.place.create({
      data: {
        name: "Zephyria National Preserve",
        state: "MT",
        publicAccess: "OA",
      },
    });

    const response = await supertest(app)
      .get("/api/places?query=zephyr")
      .set("Cookie", await getAuthCookies())
      .expect("Content-Type", /json/)
      .expect(200);

    const returned = response.body.places.find(
      (p: { id: string }) => p.id === place.id,
    );
    expect(returned).toEqual({
      id: place.id,
      name: "Zephyria National Preserve",
      state: "MT",
      publicAccess: "Open",
    });
  });

  it("applies the state filter", async () => {
    const mt = await db.place.create({
      data: { name: "Statesville Range", state: "MT" },
    });
    const id = await db.place.create({
      data: { name: "Statesville Range", state: "ID" },
    });

    const response = await supertest(app)
      .get("/api/places?query=statesville&state=MT")
      .set("Cookie", await getAuthCookies())
      .expect(200);

    const ids = response.body.places.map((p: { id: string }) => p.id);
    expect(ids).toContain(mt.id);
    expect(ids).not.toContain(id.id);
  });

  it("returns a validation error when the query is blank", async () => {
    await supertest(app)
      .get("/api/places?query=")
      .set("Cookie", await getAuthCookies())
      .expect(400);
  });
});
