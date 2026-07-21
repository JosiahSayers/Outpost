import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { adminSessionSearchQuery } from "$/validation/admin/sessions";
import { idParam } from "$/validation/shared";
import { Router } from "express";
import validate from "express-zod-safe";
import type { SessionFindManyArgs } from "../../../../generated/prisma/models";

export const userSessionsRouter = Router({ mergeParams: true });

userSessionsRouter.get(
  "/",
  validate({ params: idParam, query: adminSessionSearchQuery }),
  async (req, res) => {
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

    return res.status(sessions.length === 0 ? 404 : 200).json({
      sessions: page.items,
      total: page.total,
      pageSize: page.pageSize,
    });
  },
);
