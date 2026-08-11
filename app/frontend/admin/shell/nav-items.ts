import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwiseIcon,
  BowlFoodIcon,
  ChatCircleTextIcon,
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
      "Look up any account by name or email. Impersonation, resets, and sessions live here.",
  },
  {
    label: "Feedback",
    href: "/console/feedback",
    icon: ChatCircleTextIcon,
    section: "Support",
    description:
      "User-submitted feedback — filter by status, leave notes, and track it through to resolution.",
  },
  {
    label: "Public Meals",
    href: "/console/meals",
    icon: BowlFoodIcon,
    section: "Support",
    description:
      "Search, curate, and edit the public meal catalog surfaced across meal plans.",
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
    href: "/console/queues",
    icon: StackIcon,
    section: "System",
    description:
      "BullMQ dashboard where you can check the status of background jobs",
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
