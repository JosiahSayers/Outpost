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

describe("GET /:id/sessions", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/users/some-id/sessions").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/users/some-id/sessions")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 200 with an empty pagination response when the user has no sessions", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      sessions: [],
      total: 0,
      pageSize: 10,
    });
  });

  it("returns a 404 for a user id that doesn't exist", async () => {
    await request(app)
      .get("/admin/users/does-not-exist/sessions")
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("returns the sessions belonging to the requested user", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    const session = await db.session.create({
      data: make("Session", { userId: target.id }),
    });

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      sessions: [
        {
          id: session.id,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          impersonatedBy: session.impersonatedBy,
          ipAddress: session.ipAddress,
          updatedAt: session.updatedAt.toISOString(),
          userAgent: session.userAgent,
        },
      ],
      total: 1,
      pageSize: 10,
    });
  });

  it("does not return sessions belonging to other users", async () => {
    const target = await db.user.create({ data: make("User") });
    const other = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id, other.id);

    await db.session.create({ data: make("Session", { userId: other.id }) });

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.sessions).toEqual([]);
  });

  it("filters to active sessions when status=active is provided", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    const active = await db.session.create({
      data: make("Session", {
        userId: target.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    });
    await db.session.create({
      data: make("Session", {
        userId: target.id,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      }),
    });

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .query({ status: "active" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.sessions).toEqual([
      expect.objectContaining({ id: active.id }),
    ]);
    expect(response.body.total).toBe(1);
  });

  it("filters to expired sessions when status=expired is provided", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    await db.session.create({
      data: make("Session", {
        userId: target.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    });
    const expired = await db.session.create({
      data: make("Session", {
        userId: target.id,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      }),
    });

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .query({ status: "expired" })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.sessions).toEqual([
      expect.objectContaining({ id: expired.id }),
    ]);
    expect(response.body.total).toBe(1);
  });

  it("paginates results using take and skip", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    await db.session.createMany({
      data: [
        make("Session", { userId: target.id }),
        make("Session", { userId: target.id }),
        make("Session", { userId: target.id }),
      ],
    });

    const response = await request(app)
      .get(`/admin/users/${target.id}/sessions`)
      .query({ take: 2, skip: 1 })
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.sessions).toHaveLength(2);
    expect(response.body.total).toBe(3);
    expect(response.body.pageSize).toBe(2);
  });

  it("rejects an invalid status", async () => {
    const response = await request(app)
      .get("/admin/users/some-id/sessions")
      .query({ status: "bogus" })
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "query",
        errors: [
          expect.objectContaining({
            code: "invalid_value",
            path: ["status"],
          }),
        ],
      }),
    ]);
  });
});

describe("DELETE /:sessionId", () => {
  it("requires a valid session", async () => {
    await request(app)
      .delete("/admin/users/some-id/sessions/some-session-id")
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .delete("/admin/users/some-id/sessions/some-session-id")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns a 404 for a session id that doesn't exist", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    await request(app)
      .delete(`/admin/users/${target.id}/sessions/does-not-exist`)
      .set("Cookie", adminAuthCookies)
      .expect(404);
  });

  it("does not revoke a session belonging to another user", async () => {
    const target = await db.user.create({ data: make("User") });
    const other = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id, other.id);

    const session = await db.session.create({
      data: make("Session", { userId: other.id }),
    });

    await request(app)
      .delete(`/admin/users/${target.id}/sessions/${session.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(404);

    expect(
      await db.session.findUnique({ where: { id: session.id } }),
    ).not.toBeNull();
  });

  it("revokes the session", async () => {
    const target = await db.user.create({ data: make("User") });
    createdUserIds.push(target.id);

    const session = await db.session.create({
      data: make("Session", { userId: target.id }),
    });

    await request(app)
      .delete(`/admin/users/${target.id}/sessions/${session.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(
      await db.session.findUnique({ where: { id: session.id } }),
    ).toBeNull();
  });
});
