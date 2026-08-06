import { inferMetadataQueue } from "$/jobs/workers/feedback/infer-metadata";
import { requireValidSession } from "$/middleware/require-valid-session";
import { db } from "$/utils/db";
import { createFeedback } from "$/validation/feedback";
import { Router } from "express";
import validate from "express-zod-safe";

export const feedbackRouter = Router();

feedbackRouter.use(requireValidSession);

feedbackRouter.post(
  "/",
  validate({ body: createFeedback }),
  async (req, res) => {
    const feedback = await db.feedback.create({
      data: {
        text: req.body.text,
        submittedOnPage: req.body.submittedOnPage,
        userId: req.session!.user.id,
      },
    });

    // TODO: Notify admins? (will most likely do an hourly/daily/tbd rollup of new feedback)
    inferMetadataQueue.add("infer-feedback-metadata", {
      feedbackId: feedback.id,
    });

    return res.status(200).json({ referenceId: feedback.id });
  },
);
