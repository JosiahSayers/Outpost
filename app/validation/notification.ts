import { booleanQueryParam, numberQueryParam } from "$/validation/shared";
import z from "zod";

export const notificationSearch = z.strictObject({
  take: numberQueryParam(5, { max: 25 }),
  skip: numberQueryParam(0),
  read: booleanQueryParam(),
  dismissed: booleanQueryParam(),
});

export const editNotification = z.strictObject({
  read: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});
