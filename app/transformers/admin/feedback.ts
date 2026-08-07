import type { Feedback } from "../../../generated/prisma/browser";

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
