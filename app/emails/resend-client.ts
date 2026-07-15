import { Resend } from "resend";

export const resend = new Resend(Bun.env.RESEND_API_KEY);

export const FROM_ADDRESSES = {
  NO_REPLY: "Outpost <no-reply@outpost.sayerscloud.com>",
} as const;
