import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";
import { transform } from "$/transformers/account-settings/user-account-settings";

describe("transform", () => {
  it("uses the setting's defaultValue when the user has no override", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });

    const result = transform({ ...setting, accountSettingValues: [] });

    expect(result).toEqual({
      slug: setting.slug,
      name: setting.name,
      description: setting.description,
      defaultValue: setting.defaultValue,
      value: "default",
    });
  });

  it("uses the user's value when an override exists for the setting", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "overridden",
    });

    const result = transform({
      ...setting,
      accountSettingValues: [userSetting],
    });

    expect(result.value).toBe("overridden");
  });

  it("uses only the first accountSettingValue when several are present", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "overridden",
    });
    const otherUserSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "other",
    });

    const result = transform({
      ...setting,
      accountSettingValues: [userSetting, otherUserSetting],
    });

    expect(result.value).toBe("overridden");
  });

  it("falls back to null when there is no override and defaultValue is null", () => {
    const setting = make("AccountSetting", { defaultValue: null });

    const result = transform({ ...setting, accountSettingValues: [] });

    expect(result.value).toBeNull();
  });
});
