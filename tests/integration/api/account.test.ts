import { app } from "$/server";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { getAuthCookies } from "../../helpers/auth";
import { make } from "../../helpers/test-data/make";

let authCookies: Array<string>;
let userId: string;

beforeEach(async () => {
  authCookies = await getAuthCookies();

  const user = await db.user.findUnique({ where: { email: "user@test.com" } });
  userId = user!.id;
});

describe("GET /settings", () => {
  it("requires a valid session", async () => {
    await request(app).get("/api/account/settings").expect(401);
  });

  it("returns every account setting with its defaultValue when the user has no overrides", async () => {
    const response = await request(app)
      .get("/api/account/settings")
      .set("Cookie", authCookies)
      .expect("Content-Type", /json/)
      .expect(200);

    const allSettings = await db.accountSetting.findMany();
    expect(response.body.settings).toHaveLength(allSettings.length);
    for (const setting of allSettings) {
      expect(response.body.settings).toContainEqual({
        slug: setting.slug,
        name: setting.name,
        description: setting.description,
        defaultValue: setting.defaultValue,
        value: setting.defaultValue,
      });
    }
  });

  it("returns the user's value for a setting they have overridden", async () => {
    const setting = await db.accountSetting.findUniqueOrThrow({
      where: { slug: "weight_viewing_unit" },
    });
    await db.accountSettingValue.create({
      data: make("AccountSettingValue", {
        accountSettingId: setting.id,
        userId,
        value: "kg",
      }),
    });

    const response = await request(app)
      .get("/api/account/settings")
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.settings).toContainEqual({
      slug: setting.slug,
      name: setting.name,
      description: setting.description,
      defaultValue: setting.defaultValue,
      value: "kg",
    });
  });

  it("does not leak another user's overridden value", async () => {
    const setting = await db.accountSetting.findUniqueOrThrow({
      where: { slug: "weight_viewing_unit" },
    });
    const user2 = await db.user.findUniqueOrThrow({
      where: { email: "user2@test.com" },
    });
    await db.accountSettingValue.create({
      data: make("AccountSettingValue", {
        accountSettingId: setting.id,
        userId: user2.id,
        value: "kg",
      }),
    });

    const response = await request(app)
      .get("/api/account/settings")
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.settings).toContainEqual({
      slug: setting.slug,
      name: setting.name,
      description: setting.description,
      defaultValue: setting.defaultValue,
      value: setting.defaultValue,
    });
  });
});
