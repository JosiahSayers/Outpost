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
  section?: "Support" | "System";
  // Every tool below is scaffolding for a card in the Admin Tools project
  // (BTP-55 through BTP-62) — flip this off as each one ships its own page.
  comingSoon?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Overview", href: "/console", icon: GaugeIcon },
  {
    label: "User Search",
    href: "/console/users",
    icon: MagnifyingGlassIcon,
    comingSoon: true,
  },
  {
    label: "Audit Log",
    href: "/console/audit-log",
    icon: ClipboardTextIcon,
    section: "Support",
    comingSoon: true,
  },
  {
    label: "Demo Account",
    href: "/console/demo-account",
    icon: ArrowsClockwiseIcon,
    section: "Support",
    comingSoon: true,
  },
  {
    label: "Queues",
    href: "/console/queues",
    icon: StackIcon,
    section: "System",
    comingSoon: true,
  },
  {
    label: "Feature Flags",
    href: "/console/feature-flags",
    icon: FlagIcon,
    section: "System",
    comingSoon: true,
  },
];
