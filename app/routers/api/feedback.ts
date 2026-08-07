import { inferMetadataQueue } from "$/jobs/workers/feedback/infer-metadata";
import { requireValidSession } from "$/middleware/require-valid-session";
import { feedbackRateLimiter } from "$/middleware/rate-limit";
import { db } from "$/utils/db";
import { generateReferenceId } from "$/utils/generate-reference-id";
import { createFeedback } from "$/validation/feedback";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import validate from "express-zod-safe";

export const feedbackRouter = Router();

feedbackRouter.use(requireValidSession);

const MAX_REFERENCE_ID_ATTEMPTS = 5;

async function createFeedbackWithReferenceId(data: {
  text: string;
  submittedOnPage: string;
  userId: string;
}) {
  for (let attempt = 0; attempt < MAX_REFERENCE_ID_ATTEMPTS; attempt++) {
    try {
      return await db.feedback.create({
        data: { ...data, referenceId: generateReferenceId() },
      });
    } catch (err) {
      const isLastAttempt = attempt === MAX_REFERENCE_ID_ATTEMPTS - 1;
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        !isLastAttempt
      ) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

feedbackRouter.post(
  "/",
  feedbackRateLimiter,
  validate({ body: createFeedback }),
  async (req, res) => {
    const feedback = await createFeedbackWithReferenceId({
      text: req.body.text,
      submittedOnPage: req.body.submittedOnPage,
      userId: req.session!.user.id,
    });

    // TODO: Notify admins? (will most likely do an hourly/daily/tbd rollup of new feedback)
    inferMetadataQueue.add("infer-feedback-metadata", {
      feedbackId: feedback.id,
    });

    return res.status(200).json({ referenceId: feedback.referenceId });
  },
);
