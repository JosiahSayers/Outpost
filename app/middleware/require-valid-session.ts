import type { RequestHandler } from "express";

export const requireValidSession: RequestHandler = (req, res, next) => {
  if (!req.session) {
    return res.sendStatus(401);
  }

  return next();
};
