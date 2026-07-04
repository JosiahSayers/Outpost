import type { RequestHandler } from "express";

export const requireAdminRole: RequestHandler = (req, res, next) => {
  if (req.session?.user.role !== "admin") {
    return res.sendStatus(403);
  }

  return next();
};
