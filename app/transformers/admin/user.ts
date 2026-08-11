import type { User } from "../../../generated/prisma/browser";

export interface AdminUserCounts {
  trips: number;
  gearInventoryItems: number;
  packingLists: number;
  activeSessions: number;
}

export interface AdminUserMfa {
  enabled: boolean;
  enrolledAt: Date | null;
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
  mfa: AdminUserMfa;
};

interface UserWithCounts extends User {
  _count: {
    trips: number;
    gearInventoryItems: number;
    packingLists: number;
    sessions: number;
  };
  twoFactors: Array<{ createdAt: Date; verified: boolean }>;
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

function transformMfa(item: UserWithCounts): AdminUserMfa {
  const verifiedTwoFactor = item.twoFactors.find((tf) => tf.verified);

  return {
    enabled: !!item.twoFactorEnabled,
    enrolledAt: verifiedTwoFactor?.createdAt ?? null,
  };
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
    mfa: transformMfa(item),
  };
}
