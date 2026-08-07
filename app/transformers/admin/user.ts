import type { User } from "../../../generated/prisma/browser";

export interface AdminUserCounts {
  trips: number;
  gearInventoryItems: number;
  packingLists: number;
  activeSessions: number;
}

type ClientAdminUserFields = Pick<
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

export type ClientAdminUser = ClientAdminUserFields;

export type ClientAdminUserWithCounts = ClientAdminUserFields & {
  counts: AdminUserCounts;
};

interface UserWithCounts extends User {
  _count: {
    trips: number;
    gearInventoryItems: number;
    packingLists: number;
    sessions: number;
  };
}

function transformFields(item: User): ClientAdminUserFields {
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

export function transform(item: User): ClientAdminUser {
  return transformFields(item);
}

export function transformWithCounts(
  item: UserWithCounts,
): ClientAdminUserWithCounts {
  return {
    ...transformFields(item),
    counts: {
      trips: item._count.trips,
      gearInventoryItems: item._count.gearInventoryItems,
      packingLists: item._count.packingLists,
      activeSessions: item._count.sessions,
    },
  };
}
