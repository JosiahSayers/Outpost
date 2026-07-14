import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";
import { transform } from "$/transformers/account-settings/user-account-settings";

describe("transform", () => {
  it("uses the setting's defaultValue when the user has no override", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });

    expect(transform([setting], [])).toEqual([
      {
        slug: setting.slug,
        name: setting.name,
        description: setting.description,
        defaultValue: setting.defaultValue,
        value: "default",
      },
    ]);
  });

  it("uses the user's value when an override exists for the setting", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "overridden",
    });

    const result = transform([setting], [userSetting]);

    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe("overridden");
  });

  it("only matches a user setting to its corresponding accountSettingId", () => {
    const setting = make("AccountSetting", { defaultValue: "default" });
    const unrelatedUserSetting = make("AccountSettingValue", {
      accountSettingId: "some-other-setting-id",
      value: "overridden",
    });

    const result = transform([setting], [unrelatedUserSetting]);

    expect(result).toHaveLength(1);
    expect(result[0]?.value).toBe("default");
  });

  it("maps multiple settings independently, preserving order", () => {
    const settingWithOverride = make("AccountSetting", {
      defaultValue: "default-1",
    });
    const settingWithoutOverride = make("AccountSetting", {
      defaultValue: "default-2",
    });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: settingWithOverride.id,
      value: "overridden",
    });

    const result = transform(
      [settingWithOverride, settingWithoutOverride],
      [userSetting],
    );

    expect(result).toEqual([
      expect.objectContaining({
        slug: settingWithOverride.slug,
        value: "overridden",
      }),
      expect.objectContaining({
        slug: settingWithoutOverride.slug,
        value: "default-2",
      }),
    ]);
  });

  it("returns an empty array when there are no settings", () => {
    expect(transform([], [])).toEqual([]);
  });
});
