import { auth } from "$/utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";

export const stashSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (session) {
    req.session = session;
  }

  next();
};
