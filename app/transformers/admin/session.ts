import type { Session } from "../../../generated/prisma/browser";

export type ClientSession = Pick<
  Session,
  | "id"
  | "createdAt"
  | "expiresAt"
  | "impersonatedBy"
  | "ipAddress"
  | "updatedAt"
  | "userAgent"
>;

export function transform(item: Session): ClientSession {
  return {
    id: item.id,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    impersonatedBy: item.impersonatedBy,
    ipAddress: item.ipAddress,
    updatedAt: item.updatedAt,
    userAgent: item.userAgent,
  };
}
