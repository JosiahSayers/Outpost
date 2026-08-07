import type { ClientAdminUser } from "$/transformers/admin/user";
import type { FeedbackAuditLog, User } from "../../../generated/prisma/browser";
import { transform as userTransform } from "./user";

export type ClientAdminFeedbackAuditLog = Pick<
  FeedbackAuditLog,
  "changeDescription" | "createdAt" | "id"
> & {
  admin: ClientAdminUser | null;
};

export type Input = FeedbackAuditLog & { admin: User | null };

export function transform(item: Input): ClientAdminFeedbackAuditLog {
  return {
    changeDescription: item.changeDescription,
    createdAt: item.createdAt,
    id: item.id,
    admin: item.admin ? userTransform(item.admin) : null,
  };
}
