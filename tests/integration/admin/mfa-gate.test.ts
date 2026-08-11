import { app } from "$/server";
import { db } from "$/utils/db";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

// Users/sessions are excluded from the automatic per-test DB reset (see
// tests/preload.ts), so anything created here must be cleaned up manually.
let createdUserIds: Array<string>;

beforeEach(() => {
  createdUserIds = [];
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
});

async function createAdmin(
  overrides: { twoFactorEnabled?: boolean; emailVerified?: boolean } = {},
) {
  const user = await db.user.create({
    data: make("User", {
      role: "admin",
      twoFactorEnabled: false,
      emailVerified: false,
      ...overrides,
    }),
  });
  createdUserIds.push(user.id);
  return user;
}

describe("admin console gating on MFA + verified email", () => {
  it("blocks an admin who hasn't enrolled in MFA", async () => {
    const admin = await createAdmin({ emailVerified: true });
    const cookies = await getAuthCookies(admin.email);

    await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", cookies)
      .expect(403);
  });

  it("blocks an admin with MFA enabled but an unverified email", async () => {
    const admin = await createAdmin({ twoFactorEnabled: true });
    const cookies = await getAuthCookies(admin.email);

    await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", cookies)
      .expect(403);
  });

  it("allows an admin with MFA enabled and a verified email", async () => {
    const admin = await createAdmin({
      twoFactorEnabled: true,
      emailVerified: true,
    });
    const cookies = await getAuthCookies(admin.email);

    await request(app)
      .get("/admin/dashboard/stats")
      .set("Cookie", cookies)
      .expect(200);
  });
});
