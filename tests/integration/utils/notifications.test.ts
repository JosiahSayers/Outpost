import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import { describe, expect, it } from "bun:test";

const TRIP_STATUS_UPDATE_IN_APP_SLUG = Notifications.getSlug(
  "trip_status_update",
  "in_app",
);
const TRIP_STATUS_UPDATE_EMAIL_SLUG = Notifications.getSlug(
  "trip_status_update",
  "email",
);

async function getUserId(email = "user@test.com") {
  const user = await db.user.findUnique({ where: { email } });
  return user!.id;
}

describe("getSlug", () => {
  it("builds the in_app slug", () => {
    expect(Notifications.getSlug("trip_status_update", "in_app")).toBe(
      "notification_trip_status_update_in_app",
    );
  });

  it("builds the email slug", () => {
    expect(Notifications.getSlug("trip_status_update", "email")).toBe(
      "notification_trip_status_update_email",
    );
  });
});

describe("getAllSettings", () => {
  it("only returns settings with the notification_ prefix", async () => {
    const userId = await getUserId();

    const settings = await Notifications.getAllSettings(userId);

    expect(settings.every((s) => s.slug.startsWith("notification_"))).toBe(
      true,
    );
    expect(settings.some((s) => s.slug === "weight_rollup")).toBe(false);
  });

  it("includes the seeded trip status update settings", async () => {
    const userId = await getUserId();

    const settings = await Notifications.getAllSettings(userId);
    const slugs = settings.map((s) => s.slug);

    expect(slugs).toContain(TRIP_STATUS_UPDATE_IN_APP_SLUG);
    expect(slugs).toContain(TRIP_STATUS_UPDATE_EMAIL_SLUG);
  });

  it("falls back to each setting's default value when the user has no override", async () => {
    const userId = await getUserId();

    const settings = await Notifications.getAllSettings(userId);

    expect(
      settings.find((s) => s.slug === TRIP_STATUS_UPDATE_IN_APP_SLUG)?.value,
    ).toBe(true);
    expect(
      settings.find((s) => s.slug === TRIP_STATUS_UPDATE_EMAIL_SLUG)?.value,
    ).toBe(false);
  });

  it("reflects a user's override instead of the default", async () => {
    const userId = await getUserId();
    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      true,
    );

    const settings = await Notifications.getAllSettings(userId);

    expect(
      settings.find((s) => s.slug === TRIP_STATUS_UPDATE_EMAIL_SLUG)?.value,
    ).toBe(true);
  });

  it("does not reflect another user's override", async () => {
    const userId = await getUserId();
    const otherUserId = await getUserId("user2@test.com");
    await Notifications.updateSetting(
      otherUserId,
      "trip_status_update",
      "email",
      true,
    );

    const settings = await Notifications.getAllSettings(userId);

    expect(
      settings.find((s) => s.slug === TRIP_STATUS_UPDATE_EMAIL_SLUG)?.value,
    ).toBe(false);
  });
});

describe("getSetting", () => {
  it("returns the default value when the user has no override", async () => {
    const userId = await getUserId();

    const setting = await Notifications.getSetting(
      userId,
      "trip_status_update",
      "in_app",
    );

    expect(setting).toEqual({
      slug: TRIP_STATUS_UPDATE_IN_APP_SLUG,
      name: "Trip Status Updates - In-App",
      description: expect.any(String),
      defaultValue: "true",
      value: true,
    });
  });

  it("returns the user's overridden value", async () => {
    const userId = await getUserId();
    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "in_app",
      false,
    );

    const setting = await Notifications.getSetting(
      userId,
      "trip_status_update",
      "in_app",
    );

    expect(setting.value).toBe(false);
  });

  it("throws when the notification does not exist", async () => {
    const userId = await getUserId();

    await expect(
      Notifications.getSetting(userId, "does_not_exist", "in_app"),
    ).rejects.toThrow("Notification does not exist");
  });
});

describe("updateSetting", () => {
  it("creates a value for a user that has none yet", async () => {
    const userId = await getUserId();

    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      true,
    );

    const setting = await db.accountSetting.findUnique({
      where: { slug: TRIP_STATUS_UPDATE_EMAIL_SLUG },
      include: { accountSettingValues: { where: { userId } } },
    });
    expect(setting?.accountSettingValues[0]?.value).toBe("true");
  });

  it("updates an existing value rather than duplicating it", async () => {
    const userId = await getUserId();
    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      true,
    );

    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      false,
    );

    const setting = await db.accountSetting.findUnique({
      where: { slug: TRIP_STATUS_UPDATE_EMAIL_SLUG },
      include: { accountSettingValues: { where: { userId } } },
    });
    expect(setting?.accountSettingValues).toHaveLength(1);
    expect(setting?.accountSettingValues[0]?.value).toBe("false");
  });

  it("returns the updated setting", async () => {
    const userId = await getUserId();

    const result = await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      true,
    );

    expect(result).toEqual({
      slug: TRIP_STATUS_UPDATE_EMAIL_SLUG,
      name: "Trip Status Updates - Email",
      description: expect.any(String),
      defaultValue: "false",
      value: true,
    });
  });

  it("does not affect other users' values", async () => {
    const userId = await getUserId();
    const otherUserId = await getUserId("user2@test.com");

    await Notifications.updateSetting(
      userId,
      "trip_status_update",
      "email",
      true,
    );

    const otherSetting = await Notifications.getSetting(
      otherUserId,
      "trip_status_update",
      "email",
    );
    expect(otherSetting.value).toBe(false);
  });

  it("throws when the notification does not exist", async () => {
    const userId = await getUserId();

    await expect(
      Notifications.updateSetting(userId, "does_not_exist", "in_app", true),
    ).rejects.toThrow("Notification does not exist");
  });
});
