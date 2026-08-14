import { redisClient } from "$/utils/redis";

export const FEATURES = ["trip-file-upload"] as const;
export type Feature = (typeof FEATURES)[number];

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

export const Features = {
  enabledForUser,
  enableForUser,
  disableForUser,
  enabled,
  enable,
  disable,
};
