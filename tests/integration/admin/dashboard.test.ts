import { app } from "$/server";
import { statSort } from "$/utils/admin/stats";
import { db } from "$/utils/db";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let adminAuthCookies: Array<string>;
// The `user` table is excluded from the automatic per-test reset (see
// tests/preload.ts) so login cookies stay valid across tests, so any users
// created here must be cleaned up manually to avoid leaking into other tests.
let createdUserIds: Array<string>;

beforeEach(async () => {
  authCookies = await getAuthCookies();
  adminAuthCookies = await getAuthCookies("admin@test.com");
  createdUserIds = [];
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

describe("GET /stats", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/dashboard/stats").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the sort position for every supported stat", async () => {
    const response = await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ statsWithSortPosition: statSort });
  });
});

describe("GET /stats/:stat", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/dashboard/stats/banned_users").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/dashboard/stats/banned_users")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns the computed stat for a supported stat name", async () => {
    const banned = await db.user.create({
      data: make("User", { banned: true }),
    });
    createdUserIds.push(banned.id);
    const totalBanned = await db.user.count({ where: { banned: true } });

    const response = await request(app)
      .get("/admin/dashboard/stats/banned_users")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      stat: {
        stat: "banned_users",
        label: "Banned Users",
        value: `${totalBanned}`,
        delta: null,
        trend: null,
        sort: statSort["banned_users"],
      },
    });
  });

  it("returns a validation error for an unsupported stat name", async () => {
    const response = await request(app)
      .get("/admin/dashboard/stats/not_a_real_stat")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchObject([{ type: "params" }]);
  });
});
