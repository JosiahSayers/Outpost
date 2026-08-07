import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { feedbackSearch } from "$/validation/admin/feedback";
import { idParam } from "$/validation/shared";
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
          duplicateId: null, // Only get "root" feedback, none that are marked as a duplicate
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

adminFeedbackRouter.get(
  "/:id",
  validate({ params: idParam }),
  async (req, res) => {
    const feedback = await db.feedback.findUnique({
      where: { id: req.params.id },
      include: {
        feedbackNotes: {
          include: {
            admin: true,
          },
        },
        feedbackAuditLogs: {
          include: {
            admin: true,
          },
        },
        duplicates: true,
      },
    });

    if (!feedback) {
      return res.sendStatus(404);
    }

    return res.json({
      feedback: transformers.admin.fullFeedback(feedback),
    });
  },
);
