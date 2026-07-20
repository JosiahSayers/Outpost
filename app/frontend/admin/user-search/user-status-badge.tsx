import type { ClientAdminUser } from "$/transformers/admin/user";
import { Badge } from "@mantine/core";

interface UserStatusBadgeProps {
  user: Pick<ClientAdminUser, "banned" | "emailVerified">;
}

export default function UserStatusBadge({ user }: UserStatusBadgeProps) {
  if (user.banned) {
    return <Badge color="red">Banned</Badge>;
  }

  if (!user.emailVerified) {
    return <Badge color="trail-dust">Unverified</Badge>;
  }

  return <Badge color="trail-green">Verified</Badge>;
}
