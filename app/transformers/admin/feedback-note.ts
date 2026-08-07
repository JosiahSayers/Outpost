import type { ClientAdminUser } from "$/transformers/admin/user";
import type { FeedbackNote, User } from "../../../generated/prisma/browser";
import { transform as userTransform } from "./user";

export type ClientAdminFeedbackNote = Pick<
  FeedbackNote,
  "createdAt" | "id" | "message" | "userFacing"
> & { admin: ClientAdminUser | null };

export type Input = FeedbackNote & {
  admin: User | null;
};

export function transform(item: Input): ClientAdminFeedbackNote {
  return {
    createdAt: item.createdAt,
    id: item.id,
    message: item.message,
    userFacing: item.userFacing,
    admin: item.admin ? userTransform(item.admin) : null,
  };
}
