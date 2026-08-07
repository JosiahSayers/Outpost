import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { feedbackSearch } from "$/validation/admin/feedback";
import { Router } from "express";
import validate from "express-zod-safe";

export const adminFeedbackRouter = Router();

adminFeedbackRouter.get(
  "/",
  validate({ query: feedbackSearch }),
  async (req, res) => {
    const { take, skip, status } = req.query;

    const [feedback, count] = await db.$transaction([
      db.feedback.findMany({
        where: {
          status: { in: status },
        },
        orderBy: {
          createdAt: "desc",
        },
        take,
        skip,
      }),
      db.feedback.count({
        where: {
          status: { in: status },
        },
      }),
    ]);

    return res.json(
      paginate(feedback, transformers.admin.feedback, count, take, "feedback"),
    );
  },
);
