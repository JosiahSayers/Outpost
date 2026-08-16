import { app } from "$/server";
import { FEATURE_META, Features } from "$/utils/features";
import { db } from "$/utils/db";
import { redisClient } from "$/utils/redis";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

const FEATURE = "trip-file-upload";
const USER_ID = "user-1";

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
  await redisClient.del(`features:${FEATURE}`);
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("GET /", () => {
  it("requires a valid session", async () => {
    await request(app).get("/admin/features").expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get("/admin/features")
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("returns every known feature with its meta info", async () => {
    const response = await request(app)
      .get("/admin/features")
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      features: [
        {
          feature: FEATURE,
          name: FEATURE_META[FEATURE].name,
          description: FEATURE_META[FEATURE].description,
        },
      ],
    });
  });
});

describe("GET /:feature", () => {
  it("requires a valid session", async () => {
    await request(app).get(`/admin/features/${FEATURE}`).expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get(`/admin/features/${FEATURE}`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .get("/admin/features/not-a-real-feature")
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("returns the feature's status", async () => {
    const response = await request(app)
      .get(`/admin/features/${FEATURE}`)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({
      feature: {
        meta: FEATURE_META[FEATURE],
        enabled: false,
        disabledUserIds: [],
        enabledUsers: [],
      },
    });
  });

  it("reflects enabled state and per-user overrides", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, user.id);

    const response = await request(app)
      .get(`/admin/features/${FEATURE}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feature).toMatchObject({
      meta: FEATURE_META[FEATURE],
      enabled: true,
      disabledUserIds: [],
    });
    expect(response.body.feature.enabledUsers).toEqual([
      expect.objectContaining({ id: user.id }),
    ]);
  });

  it("includes the transformed user record for each enabled user", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enableForUser(FEATURE, user.id);

    const response = await request(app)
      .get(`/admin/features/${FEATURE}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feature.enabledUsers).toEqual([
      {
        id: user.id,
        banExpires: user.banExpires,
        banReason: user.banReason,
        banned: user.banned,
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        name: user.name,
        role: user.role,
        updatedAt: user.updatedAt.toISOString(),
      },
    ]);
  });

  it("does not include disabled or unrelated users", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);
    await Features.enableForUser(FEATURE, user.id);
    await Features.disableForUser(FEATURE, user.id);

    const response = await request(app)
      .get(`/admin/features/${FEATURE}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body.feature.enabledUsers).toEqual([]);
  });
});

describe("POST /:feature/enable", () => {
  it("requires a valid session", async () => {
    await request(app).post(`/admin/features/${FEATURE}/enable`).expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/enable`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .post("/admin/features/not-a-real-feature/enable")
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("enables the feature", async () => {
    expect(await Features.enabled(FEATURE)).toBe(false);

    await request(app)
      .post(`/admin/features/${FEATURE}/enable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabled(FEATURE)).toBe(true);
  });
});

describe("POST /:feature/disable", () => {
  it("requires a valid session", async () => {
    await request(app).post(`/admin/features/${FEATURE}/disable`).expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/disable`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .post("/admin/features/not-a-real-feature/disable")
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("disables the feature", async () => {
    await Features.enable(FEATURE);

    await request(app)
      .post(`/admin/features/${FEATURE}/disable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabled(FEATURE)).toBe(false);
  });
});

describe("GET /:feature/user/:userId", () => {
  it("requires a valid session", async () => {
    await request(app)
      .get(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .get(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .get(`/admin/features/not-a-real-feature/user/${USER_ID}`)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("rejects a user that doesn't exist", async () => {
    const response = await request(app)
      .get(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .set("Cookie", adminAuthCookies)
      .expect(404);

    expect(response.body).toEqual({ error: "User not found" });
  });

  it("returns false when neither the global flag nor the per-user flag is set", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    const response = await request(app)
      .get(`/admin/features/${FEATURE}/user/${user.id}`)
      .set("Cookie", adminAuthCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    expect(response.body).toEqual({ enabled: false });
  });

  it("returns true once the feature is enabled for the user, regardless of the global flag", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enableForUser(FEATURE, user.id);

    const response = await request(app)
      .get(`/admin/features/${FEATURE}/user/${user.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(response.body).toEqual({ enabled: true });
  });
});

describe("POST /:feature/user/:userId/enable", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/enable`)
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/enable`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .post(`/admin/features/not-a-real-feature/user/${USER_ID}/enable`)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("rejects a user that doesn't exist", async () => {
    const response = await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/enable`)
      .set("Cookie", adminAuthCookies)
      .expect(404);

    expect(response.body).toEqual({ error: "User not found" });
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
  });

  it("enables the feature for the user without affecting the global flag", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await request(app)
      .post(`/admin/features/${FEATURE}/user/${user.id}/enable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabled(FEATURE)).toBe(false);
    const { enabledUserIds } = await Features.status(FEATURE);
    expect(enabledUserIds).toEqual([user.id]);
  });

  it("does not affect other users", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, "some-other-user");

    await request(app)
      .post(`/admin/features/${FEATURE}/user/${user.id}/enable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabledForUser(FEATURE, "some-other-user")).toBe(
      true,
    );
  });
});

describe("POST /:feature/user/:userId/disable", () => {
  it("requires a valid session", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/disable`)
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/disable`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .post(`/admin/features/not-a-real-feature/user/${USER_ID}/disable`)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("rejects a user that doesn't exist", async () => {
    const response = await request(app)
      .post(`/admin/features/${FEATURE}/user/${USER_ID}/disable`)
      .set("Cookie", adminAuthCookies)
      .expect(404);

    expect(response.body).toEqual({ error: "User not found" });
  });

  it("disables the feature for the user without affecting other users", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enableForUser(FEATURE, user.id);
    await Features.enableForUser(FEATURE, "some-other-user");

    await request(app)
      .post(`/admin/features/${FEATURE}/user/${user.id}/disable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabledForUser(FEATURE, user.id)).toBe(false);
    expect(await Features.enabledForUser(FEATURE, "some-other-user")).toBe(
      true,
    );
  });

  it("overrides the global flag when the user is explicitly disabled", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, user.id);

    await request(app)
      .post(`/admin/features/${FEATURE}/user/${user.id}/disable`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabledForUser(FEATURE, user.id)).toBe(false);
  });
});

describe("DELETE /:feature/user/:userId", () => {
  it("requires a valid session", async () => {
    await request(app)
      .delete(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .expect(401);
  });

  it("requires an admin role", async () => {
    await request(app)
      .delete(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .set("Cookie", authCookies)
      .expect(403);
  });

  it("rejects an unknown feature", async () => {
    const response = await request(app)
      .delete(`/admin/features/not-a-real-feature/user/${USER_ID}`)
      .set("Cookie", adminAuthCookies)
      .expect(400);

    expect(response.body).toEqual([
      expect.objectContaining({
        type: "params",
        errors: [expect.objectContaining({ path: ["feature"] })],
      }),
    ]);
  });

  it("rejects a user that doesn't exist", async () => {
    const response = await request(app)
      .delete(`/admin/features/${FEATURE}/user/${USER_ID}`)
      .set("Cookie", adminAuthCookies)
      .expect(404);

    expect(response.body).toEqual({ error: "User not found" });
  });

  it("removes the user's override without affecting other users", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enableForUser(FEATURE, user.id);
    await Features.enableForUser(FEATURE, "some-other-user");

    await request(app)
      .delete(`/admin/features/${FEATURE}/user/${user.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabledForUser(FEATURE, user.id)).toBe(false);
    expect(await Features.enabledForUser(FEATURE, "some-other-user")).toBe(
      true,
    );
  });

  it("reverts the user to the global flag instead of leaving them explicitly disabled", async () => {
    const user = await db.user.create({ data: make("User") });
    createdUserIds.push(user.id);

    await Features.enable(FEATURE);
    await Features.disableForUser(FEATURE, user.id);

    await request(app)
      .delete(`/admin/features/${FEATURE}/user/${user.id}`)
      .set("Cookie", adminAuthCookies)
      .expect(200);

    expect(await Features.enabledForUser(FEATURE, user.id)).toBe(true);
  });
});
