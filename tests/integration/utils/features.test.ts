import { FEATURE_META, FEATURES, Features } from "$/utils/features";
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

describe("status", () => {
  it("reports the feature as disabled with no users when nothing has been set", async () => {
    expect(await Features.status(FEATURE)).toEqual({
      meta: FEATURE_META[FEATURE],
      enabled: false,
      enabledUserIds: [],
      disabledUserIds: [],
    });
  });

  it("reflects the global enabled flag", async () => {
    await Features.enable(FEATURE);
    expect(await Features.status(FEATURE)).toEqual({
      meta: FEATURE_META[FEATURE],
      enabled: true,
      enabledUserIds: [],
      disabledUserIds: [],
    });
  });

  it("sorts users into enabledUserIds and disabledUserIds", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, "user-enabled");
    await Features.enableForUser(FEATURE, "user-disabled");
    await Features.disableForUser(FEATURE, "user-disabled");

    expect(await Features.status(FEATURE)).toEqual({
      meta: FEATURE_META[FEATURE],
      enabled: true,
      enabledUserIds: ["user-enabled"],
      disabledUserIds: ["user-disabled"],
    });
  });

  it("does not count the global enabled flag as a user", async () => {
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);

    const { enabledUserIds, disabledUserIds } = await Features.status(FEATURE);

    expect(enabledUserIds).not.toContain("enabled");
    expect(disabledUserIds).not.toContain("enabled");
  });

  it("returns the meta info for the requested feature", async () => {
    const { meta } = await Features.status(FEATURE);
    expect(meta).toEqual({
      name: "Trip File Upload",
      description: "Surfaces the ability for users to upload files to a trip.",
    });
  });
});

describe("featureList", () => {
  it("returns every known feature with its meta info flattened in", async () => {
    expect(await Features.featureList()).toEqual(
      FEATURES.map((feature) => ({
        ...FEATURE_META[feature],
        feature,
      })),
    );
  });

  it("includes the trip-file-upload feature with its name and description", async () => {
    const list = await Features.featureList();
    expect(list).toContainEqual({
      feature: "trip-file-upload",
      name: "Trip File Upload",
      description: "Surfaces the ability for users to upload files to a trip.",
    });
  });

  it("is not affected by enabled/disabled state", async () => {
    const before = await Features.featureList();
    await Features.enable(FEATURE);
    await Features.enableForUser(FEATURE, USER_ID);
    const after = await Features.featureList();

    expect(after).toEqual(before);
  });
});
