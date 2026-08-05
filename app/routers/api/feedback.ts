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
        userId: req.session!.user.id,
      },
    });

    // TODO: Notify admins?
    // TODO: send to LLM for inference

    return res.status(200).json({ referenceId: feedback.id });
  },
);
