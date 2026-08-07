import { arrayQueryParam, numberQueryParam } from "$/validation/shared";
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
