import {
  arrayQueryParam,
  idParam,
  numberQueryParam,
} from "$/validation/shared";
import z from "zod";
import { FeedbackStatus } from "../../../generated/prisma/enums";

const defaultStatuses = [
  "new",
  "in_progress",
  "planned",
  "triaged",
] satisfies FeedbackStatus[];

export const feedbackSearch = z.strictObject({
  take: numberQueryParam(10, { max: 25, min: 1 }),
  skip: numberQueryParam(0),
  status: arrayQueryParam(z.enum(FeedbackStatus), defaultStatuses),
});

export const editFeedback = z.strictObject({
  status: z.enum(FeedbackStatus),
});

export const feedbackNoteParams = idParam.extend({
  noteId: z.string(),
});

export const createFeedbackNote = z.strictObject({
  message: z.string().max(1500),
  userFacing: z.boolean().default(false),
});

export const editFeedbackNote = z.strictObject({
  message: z.string().max(1500).optional(),
  userFacing: z.boolean().optional(),
});
