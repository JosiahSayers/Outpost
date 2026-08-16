import { Features, type Feature } from "$/utils/features";
import type { RequestHandler } from "express";

export const userHasFeature =
  (feature: Feature): RequestHandler =>
  async (req, res, next) => {
    const userHasFeature = await Features.enabledForUser(
      feature,
      req.session!.user.id,
    );
    if (!userHasFeature) {
      return res.sendStatus(403);
    }

    return next();
  };
