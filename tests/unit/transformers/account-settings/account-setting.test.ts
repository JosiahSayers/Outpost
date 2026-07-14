import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";
import { transform } from "$/transformers/account-settings/account-setting";

describe("transform", () => {
  it("returns the expected shape", () => {
    const accountSetting = make("AccountSetting");
    expect(transform(accountSetting)).toEqual({
      slug: accountSetting.slug,
      name: accountSetting.name,
      description: accountSetting.description,
      defaultValue: accountSetting.defaultValue,
    });
  });

  it("omits fields not part of the client shape", () => {
    const accountSetting = make("AccountSetting");
    expect(transform(accountSetting)).not.toHaveProperty("id");
    expect(transform(accountSetting)).not.toHaveProperty("createdAt");
    expect(transform(accountSetting)).not.toHaveProperty("updatedAt");
  });

  it("passes through a null defaultValue", () => {
    const accountSetting = make("AccountSetting", { defaultValue: null });
    expect(transform(accountSetting).defaultValue).toBeNull();
  });
});
