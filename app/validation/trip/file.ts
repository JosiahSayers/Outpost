import { idParam } from "$/validation/shared";
import z from "zod";

export const tripFileParams = idParam.extend({
  fileId: z.string(),
});
