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
  | "submittedOnPage"
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
    submittedOnPage: item.submittedOnPage,
    text: item.text,
  };
}

// The list screen shows who filed each item, same as the detail screen —
// unlike `transform`, this requires the `user` relation to be included in
// the query, so it's kept separate rather than folded into `transform`
// itself (which `transformFull` also uses for the lightweight `duplicates`
// summaries, where the user relation isn't loaded).
export type ClientAdminFeedbackListItem = ClientAdminFeedback & {
  user: ClientAdminUser;
};

export function transformListItem(
  item: Feedback & { user: User },
): ClientAdminFeedbackListItem {
  return {
    ...transform(item),
    user: userTransform(item.user),
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
