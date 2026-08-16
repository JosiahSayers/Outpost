import { ensureUserExists } from "$/middleware/user-exists";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
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
    const enabledUsers = await db.user.findMany({
      where: {
        id: {
          in: feature.enabledUserIds,
        },
      },
    });
    return res.json({
      feature: transformers.admin.featureStatus(feature, enabledUsers),
    });
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

adminFeaturesRouter.get(
  "/:feature/user/:userId",
  validate({ params: userFeatureParams }),
  ensureUserExists("userId"),
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
  ensureUserExists("userId"),
  async (req, res) => {
    await Features.enableForUser(req.params.feature, req.params.userId);
    return res.sendStatus(200);
  },
);

adminFeaturesRouter.post(
  "/:feature/user/:userId/disable",
  validate({ params: userFeatureParams }),
  ensureUserExists("userId"),
  async (req, res) => {
    await Features.disableForUser(req.params.feature, req.params.userId);
    return res.sendStatus(200);
  },
);

adminFeaturesRouter.delete(
  "/:feature/user/:userId",
  validate({ params: userFeatureParams }),
  ensureUserExists("userId"),
  async (req, res) => {
    await Features.unsetForUser(req.params.feature, req.params.userId);
    return res.sendStatus(200);
  },
);
