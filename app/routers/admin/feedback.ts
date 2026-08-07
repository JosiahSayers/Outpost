import { feedbackExists } from "$/middleware/feedback-existence";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import {
  createFeedbackNote,
  editFeedback,
  editFeedbackNote,
  feedbackNoteParams,
  feedbackSearch,
} from "$/validation/admin/feedback";
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

adminFeedbackRouter.patch(
  "/:id",
  validate({ params: idParam, body: editFeedback }),
  async (req, res) => {
    const feedback = await db.feedback.findUnique({
      where: { id: req.params.id },
    });
    if (!feedback) {
      return res.sendStatus(404);
    }

    const [updatedFeedback, _auditLog] = await db.$transaction([
      db.feedback.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      }),
      db.feedbackAuditLog.create({
        data: {
          feedbackId: feedback.id,
          adminId: req.session!.user.id,
          changeDescription: `Status change: ${feedback.status} -> ${req.body.status}`,
        },
      }),
    ]);

    return res.json({ feedback: transformers.admin.feedback(updatedFeedback) });
  },
);

adminFeedbackRouter.post(
  "/:id/notes",
  feedbackExists,
  validate({ params: idParam, body: createFeedbackNote }),
  async (req, res) => {
    const note = await db.feedbackNote.create({
      data: {
        feedbackId: req.params.id,
        message: req.body.message,
        userFacing: req.body.userFacing,
        adminId: req.session!.user.id,
      },
      include: {
        admin: true,
      },
    });

    return res.json({ note: transformers.admin.feedbackNote(note) });
  },
);

adminFeedbackRouter.patch(
  "/:id/notes/:noteId",
  feedbackExists,
  validate({ params: feedbackNoteParams, body: editFeedbackNote }),
  async (req, res) => {
    const note = await db.feedbackNote.findUnique({
      where: {
        id: req.params.noteId,
        feedbackId: req.params.id,
      },
    });

    if (!note) {
      return res.sendStatus(404);
    }

    const updatedNote = await db.feedbackNote.update({
      where: { id: req.params.noteId },
      data: {
        message: req.body.message,
        userFacing: req.body.userFacing,
      },
      include: {
        admin: true,
      },
    });

    return res.json({ note: transformers.admin.feedbackNote(updatedNote) });
  },
);
