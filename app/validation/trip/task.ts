import { idParam, isoDate } from "$/validation/shared";
import z from "zod";
import { TripTaskPhase } from "../../../generated/prisma/enums";

export const taskParams = idParam.extend({
  taskId: z.string(),
});

export const createTask = z.strictObject({
  name: z.string().trim().min(3),
  complete: z.boolean().default(false),
  phase: z.enum(TripTaskPhase),
  dueDate: isoDate,
});

export const editTask = createTask.partial();
