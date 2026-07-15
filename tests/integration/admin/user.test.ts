import { app } from "$/server";
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
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/users").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/users")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns users matching the search term by name", async () => {
    const match = await db.user.create({
      data: make("User", { name: "Zzyzx Name Search Target" }),
    });
    createdUserIds.push(match.id);

    const response = await request(app)
      .get("/admin/users")
      .query({ search: "zzyzx name search" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body.users).toEqual([
      {
        id: match.id,
        banExpires: match.banExpires,
        banReason: match.banReason,
        banned: match.banned,
        createdAt: match.createdAt.toISOString(),
        email: match.email,
        emailVerified: match.emailVerified,
        image: match.image,
        name: match.name,
        role: match.role,
        updatedAt: match.updatedAt.toISOString(),
      },
    ]);
    expect(response.body.total).toBe(1);
  });

  it("returns users matching the search term by email", async () => {
    const match = await db.user.create({
      data: make("User", { email: "zzyzx-email-search-target@test.com" }),
    });
    createdUserIds.push(match.id);

    const response = await request(app)
      .get("/admin/users")
      .query({ search: "zzyzx-email-search-target" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.users).toEqual([
      expect.objectContaining({ id: match.id, email: match.email }),
    ]);
  });

  it("matches the search term case-insensitively", async () => {
    const match = await db.user.create({
      data: make("User", { name: "Zzyzx Case Search Target" }),
    });
    createdUserIds.push(match.id);

    const response = await request(app)
      .get("/admin/users")
      .query({ search: "ZZYZX CASE" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.users).toEqual([
      expect.objectContaining({ id: match.id }),
    ]);
  });

  it("returns a 404 with an empty pagination response when no users match the search", async () => {
    const response = await request(app)
      .get("/admin/users")
      .query({ search: "no-user-matches-this-search-term" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      users: [],
      total: 0,
      pageSize: 10,
    });
  });

  it("paginates results using take and skip", async () => {
    const pageTargets = await db.user.createManyAndReturn({
      data: [
        make("User", { name: "Zzyzx Page Target A" }),
        make("User", { name: "Zzyzx Page Target B" }),
        make("User", { name: "Zzyzx Page Target C" }),
      ],
    });
    createdUserIds.push(...pageTargets.map((user) => user.id));

    const response = await request(app)
      .get("/admin/users")
      .query({ search: "zzyzx page target", take: 2, skip: 1 })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.users).toHaveLength(2);
    expect(response.body.total).toBe(3);
    expect(response.body.pageSize).toBe(2);
  });
});
