import { auth } from "$/utils/auth";
import * as Sentry from "@sentry/bun";
import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";

export const stashSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (session) {
    req.session = session;
    Sentry.setUser({ id: session.user.id, email: session.user.email });
  } else if (req.headers.cookie?.includes("better-auth.session_token=")) {
    // The client sent a session cookie and Better Auth still came back
    // empty -- a real expiration/revocation, as opposed to the client never
    // having (or having lost) the cookie at all, which never reaches this
    // branch. Distinguishing the two server-side matters because the
    // browser can't: both cookies are httpOnly, so nothing client-side can
    // tell "no cookie" from "cookie rejected".
    req.logger.warn("Session cookie present but no session resolved", {
      path: req.originalUrl,
      userAgent: req.headers["user-agent"],
    });
  }

  next();
};
