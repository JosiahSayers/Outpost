import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let user2AuthCookies: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  user2AuthCookies = await getAuthCookies("user2@test.com");
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/api/trips").expect(401);
  });

  it("returns the trips for the logged in user", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/trips?take=100")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    const tripNames = response.body.trips.map((trip: any) => trip.name);
    expect(tripNames).toContain("Appalachian Trail");
  });

  it("does not return user 1's trips for user 2", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.create({
      data: make("Trip", { name: "Appalachian Trail", userId: user!.id }),
    });

    const response = await request(app)
      .get("/api/trips")
      .set("Cookie", user2AuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toMatchInlineSnapshot(`
      {
        "trips": [],
      }
    `);
  });

  it("defaults to returning at most 3 trips", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: Array.from({ length: 5 }, (_, i) =>
        make("Trip", { name: `Trip ${i}`, userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/trips")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.trips).toHaveLength(3);
  });

  it("sorts by status first, then by start date within each status", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: [
        make("Trip", {
          name: "Finished, later start",
          userId: user!.id,
          status: "finished",
          start: new Date("2026-02-01"),
        }),
        make("Trip", {
          name: "Planned, later start",
          userId: user!.id,
          status: "planned",
          start: new Date("2026-03-01"),
        }),
        make("Trip", {
          name: "Finished, earlier start",
          userId: user!.id,
          status: "finished",
          start: new Date("2026-01-01"),
        }),
        make("Trip", {
          name: "Planned, earlier start",
          userId: user!.id,
          status: "planned",
          start: new Date("2026-01-15"),
        }),
      ],
    });

    const response = await request(app)
      .get("/api/trips?take=100")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    // Filter out seed data
    const testTripNames = new Set([
      "Finished, later start",
      "Planned, later start",
      "Finished, earlier start",
      "Planned, earlier start",
    ]);
    const tripNames = response.body.trips
      .map((trip: any) => trip.name)
      .filter((name: string) => testTripNames.has(name));
    expect(tripNames).toEqual([
      "Planned, earlier start",
      "Planned, later start",
      "Finished, earlier start",
      "Finished, later start",
    ]);
  });

  it("respects a provided take parameter", async () => {
    const user = await db.user.findUnique({
      where: { email: "user@test.com" },
    });
    await db.trip.createMany({
      data: Array.from({ length: 5 }, (_, i) =>
        make("Trip", { name: `Trip ${i}`, userId: user!.id }),
      ),
    });

    const response = await request(app)
      .get("/api/trips?take=2")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.trips).toHaveLength(2);
  });
});
