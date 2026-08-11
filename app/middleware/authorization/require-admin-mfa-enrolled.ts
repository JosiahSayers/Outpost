import type { RequestHandler } from "express";

export const requireAdminMfaEnrolled: RequestHandler = (req, res, next) => {
  const user = req.session?.user;
  if (!user?.twoFactorEnabled || !user.emailVerified) {
    return res.sendStatus(403);
  }

  return next();
};
