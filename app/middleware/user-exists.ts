import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const ensureUserExists =
  (idParamKey: string): RequestHandler =>
  async (req, res, next) => {
    const userIdParam = String(req.params[idParamKey]);
    if (!userIdParam) {
      req.logger.error(
        `Unable to find user id at param key "${idParamKey}". Something is probably configured incorrectly on this endpoint.`,
      );
      return res.sendStatus(400);
    }

    const user = await db.user.findUnique({ where: { id: userIdParam } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return next();
  };
