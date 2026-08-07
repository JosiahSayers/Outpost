import type { ClientAdminFeedbackNote } from "$/transformers/admin/feedback-note";
import {
  transform as userTransform,
  type ClientAdminUser,
} from "$/transformers/admin/user";
import type {
  Feedback,
  FeedbackAuditLog,
  FeedbackNote,
  User,
} from "../../../generated/prisma/browser";
import {
  transform as feedbackAuditTransform,
  type ClientAdminFeedbackAuditLog,
} from "./feedback-audit-log";
import { transform as feedbackNoteTransform } from "./feedback-note";

export type ClientAdminFeedback = Pick<
  Feedback,
  | "id"
  | "createdAt"
  | "duplicateId"
  | "inferredSubject"
  | "inferredTopic"
  | "status"
  | "text"
>;

export function transform(item: Feedback): ClientAdminFeedback {
  return {
    id: item.id,
    createdAt: item.createdAt,
    duplicateId: item.duplicateId,
    inferredSubject: item.inferredSubject,
    inferredTopic: item.inferredTopic,
    status: item.status,
    text: item.text,
  };
}

export type FullFeedback = Feedback & {
  feedbackNotes: Array<FeedbackNote & { admin: User | null }>;
  feedbackAuditLogs: Array<FeedbackAuditLog & { admin: User | null }>;
  duplicates: Feedback[];
  user: User;
};

export type ClientFullAdminFeedback = ClientAdminFeedback & {
  notes: ClientAdminFeedbackNote[];
  auditLogs: ClientAdminFeedbackAuditLog[];
  duplicates: ClientAdminFeedback[];
  user: ClientAdminUser;
};

export function transformFull(item: FullFeedback): ClientFullAdminFeedback {
  return {
    ...transform(item),
    notes: item.feedbackNotes.map(feedbackNoteTransform),
    auditLogs: item.feedbackAuditLogs.map(feedbackAuditTransform),
    duplicates: item.duplicates.map(transform),
    user: userTransform(item.user),
  };
}
