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
          duplicateId: null,
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
        user: true,
        feedbackNotes: {
          include: {
            admin: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        feedbackAuditLogs: {
          include: {
            admin: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        duplicates: {
          orderBy: {
            createdAt: "desc",
          },
        },
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
    const updatedFeedback = await db.$transaction(async (tx) => {
      const feedback = await tx.feedback.findUnique({
        where: { id: req.params.id },
      });
      if (!feedback) {
        return null;
      }

      const updated = await tx.feedback.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      });

      await tx.feedbackAuditLog.create({
        data: {
          feedbackId: feedback.id,
          adminId: req.session!.user.id,
          changeDescription: `Status change: ${feedback.status} -> ${req.body.status}`,
        },
      });

      return updated;
    });

    if (!updatedFeedback) {
      return res.sendStatus(404);
    }

    return res.json({ feedback: transformers.admin.feedback(updatedFeedback) });
  },
);

adminFeedbackRouter.post(
  "/:id/notes",
  validate({ params: idParam, body: createFeedbackNote }),
  feedbackExists,
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
  validate({ params: feedbackNoteParams, body: editFeedbackNote }),
  feedbackExists,
  async (req, res) => {
    const updatedNote = await db.$transaction(async (tx) => {
      const note = await tx.feedbackNote.findUnique({
        where: {
          id: req.params.noteId,
          feedbackId: req.params.id,
        },
      });

      if (!note) {
        return null;
      }

      const updatedNote = await tx.feedbackNote.update({
        where: { id: req.params.noteId },
        data: {
          message: req.body.message,
          userFacing: req.body.userFacing,
        },
        include: {
          admin: true,
        },
      });

      if (req.body.message !== undefined && note.message !== req.body.message) {
        await tx.feedbackAuditLog.create({
          data: {
            adminId: req.session!.user.id,
            feedbackId: req.params.id,
            changeDescription: `Note (${note.id}) message updated`,
          },
        });
      }

      if (
        req.body.userFacing !== undefined &&
        note.userFacing !== req.body.userFacing
      ) {
        await tx.feedbackAuditLog.create({
          data: {
            adminId: req.session!.user.id,
            feedbackId: req.params.id,
            changeDescription: `Note (${note.id}) user facing change: ${note.userFacing} -> ${req.body.userFacing}`,
          },
        });
      }

      return updatedNote;
    });

    if (!updatedNote) {
      return res.sendStatus(404);
    }

    return res.json({ note: transformers.admin.feedbackNote(updatedNote) });
  },
);
