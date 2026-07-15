import { supportedStats } from "$/utils/admin/stats";
import z from "zod";

export const statParam = z.strictObject({
  stat: z.enum(supportedStats),
});
