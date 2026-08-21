import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";
import {
  booleanSettingTransform,
  transform,
} from "$/transformers/account-settings/user-account-settings";

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

describe("booleanSettingTransform", () => {
  it("is true when there is no override and defaultValue is 'true'", () => {
    const setting = make("AccountSetting", { defaultValue: "true" });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [],
    });

    expect(result.value).toBe(true);
  });

  it("is false when there is no override and defaultValue is 'false'", () => {
    const setting = make("AccountSetting", { defaultValue: "false" });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [],
    });

    expect(result.value).toBe(false);
  });

  it("is false when there is no override and defaultValue is null", () => {
    const setting = make("AccountSetting", { defaultValue: null });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [],
    });

    expect(result.value).toBe(false);
  });

  it("is true when the user override is 'true', regardless of defaultValue", () => {
    const setting = make("AccountSetting", { defaultValue: "false" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "true",
    });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [userSetting],
    });

    expect(result.value).toBe(true);
  });

  it("is false when the user override is 'false', even though defaultValue is 'true'", () => {
    // Regression test: booleanSettingTransform previously computed
    // `userValue === "true" || defaultValue === "true"`, which meant an
    // explicit false override was silently discarded whenever the setting
    // defaulted to true.
    const setting = make("AccountSetting", { defaultValue: "true" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "false",
    });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [userSetting],
    });

    expect(result.value).toBe(false);
  });

  it("uses only the first accountSettingValue when several are present", () => {
    const setting = make("AccountSetting", { defaultValue: "false" });
    const userSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "true",
    });
    const otherUserSetting = make("AccountSettingValue", {
      accountSettingId: setting.id,
      value: "false",
    });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [userSetting, otherUserSetting],
    });

    expect(result.value).toBe(true);
  });

  it("carries through the slug, name, description, and defaultValue fields", () => {
    const setting = make("AccountSetting", { defaultValue: "true" });

    const result = booleanSettingTransform({
      ...setting,
      accountSettingValues: [],
    });

    expect(result).toEqual({
      slug: setting.slug,
      name: setting.name,
      description: setting.description,
      defaultValue: setting.defaultValue,
      value: true,
    });
  });
});
