import { Features } from "$/utils/features";
import { featureParam, userFeatureParams } from "$/validation/admin/features";
import { Router } from "express";
import validate from "express-zod-safe";

export const adminFeaturesRouter = Router();

adminFeaturesRouter.get("/", async (req, res) => {
  const features = Features.featureList();
  return res.json({ features });
});

adminFeaturesRouter.get(
  "/:feature",
  validate({ params: featureParam }),
  async (req, res) => {
    const feature = await Features.status(req.params.feature);
    return res.json({ feature });
  },
);

adminFeaturesRouter.post(
  "/:feature/enable",
  validate({ params: featureParam }),
  async (req, res) => {
    await Features.enable(req.params.feature);
    return res.sendStatus(200);
  },
);

adminFeaturesRouter.post(
  "/:feature/disable",
  validate({ params: featureParam }),
  async (req, res) => {
    await Features.disable(req.params.feature);
    return res.sendStatus(200);
  },
);

// todo: Middleware to ensure user exists

adminFeaturesRouter.get(
  "/:feature/user/:userId",
  validate({ params: userFeatureParams }),
  async (req, res) => {
    const enabled = await Features.enabledForUser(
      req.params.feature,
      req.params.userId,
    );
    return res.json({ enabled });
  },
);

adminFeaturesRouter.post(
  "/:feature/user/:userId/enable",
  validate({ params: userFeatureParams }),
  async (req, res) => {
    await Features.enableForUser(req.params.feature, req.params.userId);
    return res.sendStatus(200);
  },
);

adminFeaturesRouter.post(
  "/:feature/user/:userId/disable",
  validate({ params: userFeatureParams }),
  async (req, res) => {
    await Features.disableForUser(req.params.feature, req.params.userId);
    return res.sendStatus(200);
  },
);
