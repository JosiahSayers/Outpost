import { FEATURES } from "$/utils/features";
import z from "zod";

export const featureParam = z.strictObject({
  feature: z.enum(FEATURES),
});

export const userFeatureParams = featureParam.extend({
  userId: z.string(),
});
