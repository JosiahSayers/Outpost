import { redisClient } from "$/utils/redis";

export const FEATURES = ["trip-file-upload"] as const;
export type Feature = (typeof FEATURES)[number];
interface FeatureMeta {
  name: string;
  description: string;
}
export const FEATURE_META: Record<Feature, FeatureMeta> = {
  "trip-file-upload": {
    name: "Trip File Upload",
    description: "Surfaces the ability for users to upload files to a trip.",
  },
};

function featureKey(feature: Feature) {
  return `features:${feature}`;
}

/**
 * If true the user has this feature enabled. This is separate from the feature-level "enabled" flag
 * @param feature
 * @param userId
 * @returns
 */
async function enabledForUser(feature: Feature, userId: string) {
  const userEnabled = await redisClient.hget(featureKey(feature), userId);
  return userEnabled === "true";
}

async function enableForUser(feature: Feature, userId: string) {
  await redisClient.hset(featureKey(feature), { [userId]: "true" });
}

async function disableForUser(feature: Feature, userId: string) {
  await redisClient.hset(featureKey(feature), { [userId]: "false" });
}

/**
 * If true the feature is enabled for all users not the the enabledForUser list
 * @param feature
 * @returns
 */
async function enabled(feature: Feature) {
  const featureEnabled = await redisClient.hget(featureKey(feature), "enabled");
  return featureEnabled === "true";
}

/**
 * Enable the feature for all users
 * @param feature
 */
async function enable(feature: Feature) {
  await redisClient.hset(featureKey(feature), { enabled: "true" });
}

/**
 * Disable the feature for all users not in the enabledForUser list
 * @param feature
 */
async function disable(feature: Feature) {
  await redisClient.hset(featureKey(feature), { enabled: "false" });
}

async function status(feature: Feature) {
  const featureEnabled = await enabled(feature);
  const users = await redisClient.hgetall(featureKey(feature));
  const userEntries = Object.entries(users).filter(
    ([key]) => key !== "enabled",
  );
  const enabledUserIds = userEntries
    .filter(([key, val]) => val === "true")
    .map(([key, val]) => key);
  const disabledUserIds = userEntries
    .filter(([key, val]) => val === "false")
    .map(([key, val]) => key);

  return {
    meta: FEATURE_META[feature],
    enabled: featureEnabled,
    enabledUserIds,
    disabledUserIds,
  };
}

function featureList() {
  return FEATURES.map((feature) => ({
    ...FEATURE_META[feature],
    feature,
  }));
}

export const Features = {
  enabledForUser,
  enableForUser,
  disableForUser,
  enabled,
  enable,
  disable,
  status,
  featureList,
};
