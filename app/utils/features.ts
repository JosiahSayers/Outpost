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

async function enabledForUser(feature: Feature, userId: string) {
  const featureEnabled = await enabled(feature);
  const userEnabled = await redisClient.hget(featureKey(feature), userId);
  return featureEnabled && userEnabled === "true";
}

async function enableForUser(feature: Feature, userId: string) {
  await redisClient.hset(featureKey(feature), { [userId]: "true" });
}

async function disableForUser(feature: Feature, userId: string) {
  await redisClient.hset(featureKey(feature), { [userId]: "false" });
}

async function enabled(feature: Feature) {
  const featureEnabled = await redisClient.hget(featureKey(feature), "enabled");
  return featureEnabled === "true";
}

async function enable(feature: Feature) {
  await redisClient.hset(featureKey(feature), { enabled: "true" });
}

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

async function featureList() {
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
