import type { User } from "../../../generated/prisma/browser";

export interface AdminUserCounts {
  trips: number;
  gearInventoryItems: number;
  packingLists: number;
  activeSessions: number;
}

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
> & { counts: AdminUserCounts };

interface UserWithCounts extends User {
  _count: {
    trips: number;
    gearInventoryItems: number;
    packingLists: number;
    sessions: number;
  };
}

export function transform(item: UserWithCounts): ClientAdminUser {
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
    counts: {
      trips: item._count.trips,
      gearInventoryItems: item._count.gearInventoryItems,
      packingLists: item._count.packingLists,
      activeSessions: item._count.sessions,
    },
  };
}
