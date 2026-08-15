import type { ClientAdminUser } from "$/transformers/admin/user";
import type { Features } from "$/utils/features";
import type { User } from "../../../../generated/prisma/browser";
import { transform as adminUserTransform } from "../user";

type FeatureStatus = Omit<
  Awaited<ReturnType<typeof Features.status>>,
  "enabledUserIds"
>;

export interface ClientFeatureStatus extends FeatureStatus {
  enabledUsers: ClientAdminUser[];
}

export function transform(
  feature: FeatureStatus,
  enabledUsers: User[],
): ClientFeatureStatus {
  return {
    enabled: feature.enabled,
    meta: feature.meta,
    disabledUserIds: feature.disabledUserIds,
    enabledUsers: enabledUsers.map(adminUserTransform),
  };
}
