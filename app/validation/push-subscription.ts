import z from "zod";

export const createPushSubscription = z.strictObject({
  endpoint: z.url(),
  keys: z.strictObject({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const deletePushSubscription = z.strictObject({
  endpoint: z.url(),
});
