import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwiseIcon,
  ClipboardTextIcon,
  FlagIcon,
  GaugeIcon,
  MagnifyingGlassIcon,
  StackIcon,
} from "@phosphor-icons/react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: Icon;
  description?: string;
  section?: "Support" | "System";
  // Every tool below is scaffolding for a card in the Admin Tools project
  // (BTP-55 through BTP-62) — flip this off as each one ships its own page.
  comingSoon?: boolean;
  external?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: "/console", icon: GaugeIcon },
  {
    label: "User Search",
    href: "/console/users",
    icon: MagnifyingGlassIcon,
    description:
      "Look up any account by name or email — the entry point for impersonation, resets, and sessions.",
  },
  {
    label: "Audit Log",
    href: "/console/audit-log",
    icon: ClipboardTextIcon,
    section: "Support",
    comingSoon: true,
    description:
      "Every impersonation, password reset, and session revocation, searchable by admin or user.",
  },
  {
    label: "Demo Account",
    href: "/console/demo-account",
    icon: ArrowsClockwiseIcon,
    section: "Support",
    comingSoon: true,
    description:
      "Reset demo@outpost.app to its seeded state for support and sales walkthroughs.",
  },
  {
    label: "Queues",
    href: "/admin/queues",
    icon: StackIcon,
    section: "System",
    external: true,
    description:
      "BullMQ dashboard — 3 queues, 16 waiting, 1 failed job needing attention.",
  },
  {
    label: "Feature Flags",
    href: "/console/feature-flags",
    icon: FlagIcon,
    section: "System",
    comingSoon: true,
    description:
      "Toggle rollouts and kill switches without a deploy. 2 of 5 flags live.",
  },
];
