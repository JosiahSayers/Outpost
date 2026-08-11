import type { ClientAdminUserWithCounts } from "$/transformers/admin/user";
import { Badge } from "@mantine/core";
import { ShieldCheckIcon, ShieldSlashIcon } from "@phosphor-icons/react";

interface MfaBadgeProps {
  user: Pick<ClientAdminUserWithCounts, "mfa">;
}

export default function MfaBadge({ user }: MfaBadgeProps) {
  if (user.mfa.enabled) {
    return (
      <Badge
        color="trail-green"
        variant="light"
        leftSection={<ShieldCheckIcon size={12} weight="bold" />}
      >
        MFA
      </Badge>
    );
  }

  return (
    <Badge
      color="stone-gray"
      variant="light"
      leftSection={<ShieldSlashIcon size={12} weight="bold" />}
    >
      No MFA
    </Badge>
  );
}
