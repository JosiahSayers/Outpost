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

describe("PATCH /settings", () => {
  it("requires a valid session", async () => {
    await request(app)
      .patch("/api/account/settings")
      .send({ settings: [{ slug: "weight_viewing_unit", value: "kilograms" }] })
      .expect(401);
  });

  it("rejects an unknown setting slug", async () => {
    const response = await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({ settings: [{ slug: "not_a_real_setting", value: "kilograms" }] })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_union",
              "discriminator": "slug",
              "errors": [],
              "message": "Invalid discriminator value. Expected 'liquid_viewing_unit' | 'liquid_entry_unit' | 'weight_viewing_unit' | 'weight_entry_unit'",
              "note": "No matching discriminator",
              "options": [
                "liquid_viewing_unit",
                "liquid_entry_unit",
                "weight_viewing_unit",
                "weight_entry_unit",
              ],
              "path": [
                "settings",
                0,
                "slug",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects a value that isn't valid for the setting's unit", async () => {
    const response = await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({ settings: [{ slug: "weight_viewing_unit", value: "stone" }] })
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_value",
              "message": "Invalid option: expected one of "grams"|"kilograms"|"ounces"|"pounds"",
              "path": [
                "settings",
                0,
                "value",
              ],
              "values": [
                "grams",
                "kilograms",
                "ounces",
                "pounds",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("rejects an empty body", async () => {
    const response = await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({})
      .expect("Content-Type", /json/)
      .expect(400);

    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "errors": [
            {
              "code": "invalid_type",
              "expected": "array",
              "message": "Invalid input: expected array, received undefined",
              "path": [
                "settings",
              ],
            },
          ],
          "type": "body",
        },
      ]
    `);
  });

  it("creates a value when the user has no existing override", async () => {
    await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({ settings: [{ slug: "weight_viewing_unit", value: "kilograms" }] })
      .expect(200);

    const setting = await db.accountSetting.findUniqueOrThrow({
      where: { slug: "weight_viewing_unit" },
    });
    const value = await db.accountSettingValue.findUnique({
      where: {
        accountSettingId_userId: { accountSettingId: setting.id, userId },
      },
    });
    expect(value?.value).toBe("kilograms");
  });

  it("updates an existing override", async () => {
    const setting = await db.accountSetting.findUniqueOrThrow({
      where: { slug: "weight_viewing_unit" },
    });
    await db.accountSettingValue.create({
      data: make("AccountSettingValue", {
        accountSettingId: setting.id,
        userId,
        value: "grams",
      }),
    });

    await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({ settings: [{ slug: "weight_viewing_unit", value: "pounds" }] })
      .expect(200);

    const value = await db.accountSettingValue.findUnique({
      where: {
        accountSettingId_userId: { accountSettingId: setting.id, userId },
      },
    });
    expect(value?.value).toBe("pounds");
  });

  it("updates multiple settings in a single request", async () => {
    await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({
        settings: [
          { slug: "weight_viewing_unit", value: "pounds" },
          { slug: "weight_entry_unit", value: "ounces" },
        ],
      })
      .expect(200);

    const response = await request(app)
      .get("/api/account/settings")
      .set("Cookie", authCookies)
      .expect(200);

    expect(response.body.settings).toContainEqual(
      expect.objectContaining({
        slug: "weight_viewing_unit",
        value: "pounds",
      }),
    );
    expect(response.body.settings).toContainEqual(
      expect.objectContaining({ slug: "weight_entry_unit", value: "ounces" }),
    );
  });

  it("allows updating every known setting", async () => {
    const allSettings = await db.accountSetting.findMany();
    const valuesBySlug: Record<string, string> = {
      liquid_viewing_unit: "liters",
      liquid_entry_unit: "cupsUS",
      weight_viewing_unit: "kilograms",
      weight_entry_unit: "ounces",
    };

    await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({
        settings: allSettings.map((setting) => ({
          slug: setting.slug,
          value: valuesBySlug[setting.slug],
        })),
      })
      .expect(200);

    const userValues = await db.accountSettingValue.findMany({
      where: { userId },
    });
    expect(userValues).toHaveLength(allSettings.length);
    for (const setting of allSettings) {
      const value = userValues.find(
        (userValue) => userValue.accountSettingId === setting.id,
      );
      expect(value?.value).toBe(valuesBySlug[setting.slug]);
    }
  });

  it("does not affect another user's overrides", async () => {
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
        value: "grams",
      }),
    });

    await request(app)
      .patch("/api/account/settings")
      .set("Cookie", authCookies)
      .send({ settings: [{ slug: "weight_viewing_unit", value: "pounds" }] })
      .expect(200);

    const user2Value = await db.accountSettingValue.findUnique({
      where: {
        accountSettingId_userId: {
          accountSettingId: setting.id,
          userId: user2.id,
        },
      },
    });
    expect(user2Value?.value).toBe("grams");
  });
});
