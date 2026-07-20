import type { AdminNavItem } from "$/frontend/admin/shell/nav-items";
import {
  ClipboardTextIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";

export function adminActions(userId: string): AdminNavItem[] {
  return [
    {
      label: "Impersonate user",
      href: `/console/users/${userId}/impersonate`,
      icon: EyeIcon,
      comingSoon: true,
      description: "Sign in as this account to reproduce what they're seeing.",
    },
    {
      label: "Reset password",
      href: `/console/users/${userId}/reset-password`,
      icon: KeyIcon,
      comingSoon: true,
      description: "Send a reset email or set a temporary password.",
    },
    {
      label: "Manage sessions",
      href: `/console/users/${userId}/sessions`,
      icon: ShieldCheckIcon,
      comingSoon: true,
      description: "View and revoke active sessions for this account.",
    },
    {
      label: "View audit log",
      href: `/console/users/${userId}/audit-log`,
      icon: ClipboardTextIcon,
      comingSoon: true,
      description: "See every admin action taken on this account.",
    },
  ];
}
