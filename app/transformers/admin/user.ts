import type { User } from "../../../generated/prisma/browser";

export type ClientAdminUser = Pick<
  User,
  | "id"
  | "banExpires"
  | "banReason"
  | "banned"
  | "createdAt"
  | "email"
  | "emailVerified"
  | "name"
  | "role"
  | "updatedAt"
  | "image"
>;

export function transform(item: User): ClientAdminUser {
  return {
    id: item.id,
    banExpires: item.banExpires,
    banReason: item.banReason,
    banned: item.banned,
    createdAt: item.createdAt,
    email: item.email,
    emailVerified: item.emailVerified,
    image: item.image,
    name: item.name,
    role: item.role,
    updatedAt: item.updatedAt,
  };
}
