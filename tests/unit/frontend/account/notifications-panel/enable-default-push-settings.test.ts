import { computeDefaultPushSettingUpdates } from "$/frontend/account/notifications-panel/enable-default-push-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { describe, expect, it } from "bun:test";

function setting(
  overrides: Partial<ClientUserAccountSetting> = {},
): ClientUserAccountSetting {
  return {
    slug: "notification_trip_status_update_in_app",
    name: "Trip Status Updates - In-App",
    description: "Test notification",
    defaultValue: "true",
    value: "true",
    ...overrides,
  };
}

describe("computeDefaultPushSettingUpdates", () => {
  it("enables push for a notification with in-app on", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "true",
      }),
      setting({
        slug: "notification_trip_status_update_email",
        value: "false",
      }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "false",
      }),
    ]);

    expect(updates).toEqual([
      { slug: "notification_trip_status_update_web_push", value: "true" },
    ]);
  });

  it("enables push for a notification with only email on", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "false",
      }),
      setting({ slug: "notification_trip_status_update_email", value: "true" }),
    ]);

    expect(updates).toEqual([
      { slug: "notification_trip_status_update_web_push", value: "true" },
    ]);
  });

  it("leaves a fully-off notification out of the updates", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "false",
      }),
      setting({
        slug: "notification_trip_status_update_email",
        value: "false",
      }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "false",
      }),
    ]);

    expect(updates).toEqual([]);
  });

  it("does not re-enable a notification already on for push, but doesn't harm it either", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "true",
      }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "true",
      }),
    ]);

    expect(updates).toEqual([
      { slug: "notification_trip_status_update_web_push", value: "true" },
    ]);
  });

  it("handles multiple notification types independently", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "true",
      }),
      setting({
        slug: "notification_meal_plan_unpurchased_items_in_app",
        value: "false",
      }),
      setting({
        slug: "notification_meal_plan_unpurchased_items_email",
        value: "false",
      }),
    ]);

    expect(updates).toEqual([
      { slug: "notification_trip_status_update_web_push", value: "true" },
    ]);
  });

  it("ignores non-notification settings and web_push entries themselves", () => {
    const updates = computeDefaultPushSettingUpdates([
      setting({ slug: "weight_rollup", value: "true" }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "true",
      }),
    ]);

    expect(updates).toEqual([]);
  });

  it("returns an empty array for no settings", () => {
    expect(computeDefaultPushSettingUpdates([])).toEqual([]);
  });
});
