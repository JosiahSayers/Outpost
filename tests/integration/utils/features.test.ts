import { Features } from "$/utils/features";
import { redisClient } from "$/utils/redis";
import { afterEach, describe, expect, it } from "bun:test";

const FEATURE = "trip-file-upload";
const USER_ID = "user-1";

afterEach(async () => {
  await redisClient.del(`features:${FEATURE}`);
});

describe("enabled / enable / disable", () => {
  it("is disabled by default", async () => {
    expect(await Features.enabled(FEATURE)).toBe(false);
  });

  it("returns true after being enabled", async () => {
    await Features.enable(FEATURE);
    expect(await Features.enabled(FEATURE)).toBe(true);
  });

  it("returns false after being disabled again", async () => {
    await Features.enable(FEATURE);
    await Features.disable(FEATURE);
    expect(await Features.enabled(FEATURE)).toBe(false);
  });
});

describe("enabledForUser / enableForUser / disableForUser", () => {
  it("is disabled for a user by default", async () => {
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
  });

  it("is still disabled for a user when only the per-user flag is set, not the global flag", async () => {
    await Features.enableForUser(FEATURE, USER_ID);
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
  });

  it("is still disabled for a user when only the global flag is enabled, not the per-user flag", async () => {
    await Features.enable(FEATURE);
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
  });

  it("is enabled for a user once both the global flag and the per-user flag are enabled", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(true);
  });

  it("does not enable the feature for other users", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);
    expect(await Features.enabledForUser(FEATURE, "some-other-user")).toBe(
      false,
    );
  });

  it("returns false for a user after being disabled again", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);
    await Features.disableForUser(FEATURE, USER_ID);
    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
  });

  it("does not affect other users when disabling for one user", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);
    await Features.enableForUser(FEATURE, "some-other-user");

    await Features.disableForUser(FEATURE, USER_ID);

    expect(await Features.enabledForUser(FEATURE, USER_ID)).toBe(false);
    expect(await Features.enabledForUser(FEATURE, "some-other-user")).toBe(
      true,
    );
  });
});
