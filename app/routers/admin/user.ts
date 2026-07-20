import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { adminUserSearchParams } from "$/validation/admin/users";
import { Router } from "express";
import validate from "express-zod-safe";
import type { UserFindManyArgs } from "../../../generated/prisma/models";

export const adminUserRouter = Router();

adminUserRouter.get(
  "/",
  validate({ query: adminUserSearchParams }),
  async (req, res) => {
    const where: UserFindManyArgs["where"] = {
      OR: [
        {
          name: {
            contains: req.query.search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: req.query.search,
            mode: "insensitive",
          },
        },
      ],
    };

    const [userList, total] = await Promise.all([
      db.user.findMany({
        where,
        take: req.query.take,
        skip: req.query.skip,
        include: {
          _count: {
            select: {
              trips: true,
              gearInventoryItems: true,
              packingLists: true,
              sessions: { where: { expiresAt: { gt: new Date() } } },
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    const page = paginate(
      userList,
      transformers.admin.user,
      total,
      req.query.take,
    );

    return res.status(userList.length === 0 ? 404 : 200).json({
      users: page.items,
      total: page.total,
      pageSize: page.pageSize,
    });
  },
);
