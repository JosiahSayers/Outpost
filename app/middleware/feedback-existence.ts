import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const feedbackExists: RequestHandler = async (req, res, next) => {
  const feedback = await db.feedback.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!feedback) {
    return res.sendStatus(404);
  }

  return next();
};
