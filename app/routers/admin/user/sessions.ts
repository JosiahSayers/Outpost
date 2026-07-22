import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { auth } from "$/utils/auth";
import { db } from "$/utils/db";
import {
  adminSessionParam,
  adminSessionSearchQuery,
} from "$/validation/admin/sessions";
import { idParam } from "$/validation/shared";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import validate from "express-zod-safe";
import type { SessionFindManyArgs } from "../../../../generated/prisma/models";

export const userSessionsRouter = Router({ mergeParams: true });

userSessionsRouter.get(
  "/",
  validate({ params: idParam, query: adminSessionSearchQuery }),
  async (req, res) => {
    const user = await db.user.findUnique({ where: { id: req.params.id } });

    if (!user) {
      return res.sendStatus(404);
    }

    const where: SessionFindManyArgs["where"] = {
      userId: req.params.id,
      expiresAt:
        req.query.status === "active"
          ? { gt: new Date() }
          : req.query.status === "expired"
            ? { lte: new Date() }
            : undefined,
    };

    const [sessions, total] = await Promise.all([
      db.session.findMany({
        where,
        take: req.query.take,
        skip: req.query.skip,
      }),
      db.session.count({
        where,
      }),
    ]);

    const page = paginate(
      sessions,
      transformers.admin.session,
      total,
      req.query.take,
    );

    return res.status(200).json({
      sessions: page.items,
      total: page.total,
      pageSize: page.pageSize,
    });
  },
);

userSessionsRouter.delete(
  "/:sessionId",
  validate({ params: adminSessionParam }),
  async (req, res) => {
    const session = await db.session.findUnique({
      where: { id: req.params.sessionId, userId: req.params.id },
    });

    if (!session) {
      return res.sendStatus(404);
    }

    await auth.api.revokeUserSession({
      body: { sessionToken: session.token },
      headers: fromNodeHeaders(req.headers),
    });

    return res.sendStatus(200);
  },
);
