import type { BadgeProps } from "@mantine/core";
import type { FeedbackStatus } from "../../../../generated/prisma/enums";

// Display order used everywhere a full list of statuses is shown (filter
// bar, status Select) — actionable statuses first, terminal ones after.
export const ALL_STATUSES: FeedbackStatus[] = [
  "new",
  "triaged",
  "planned",
  "in_progress",
  "completed",
  "declined",
  "duplicate",
];

// Mirrors the admin feedback API's own default status filter
// (app/validation/admin/feedback.ts) — the statuses that still need admin
// attention, pre-selected on first load of the list screen.
export const ACTIONABLE_STATUSES: FeedbackStatus[] = [
  "new",
  "triaged",
  "planned",
  "in_progress",
];

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  triaged: "Triaged",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Declined",
  duplicate: "Duplicate",
};

// Filled badges read as "still needs a decision"; outline/dot badges read as
// "settled" — a quick visual split between actionable and terminal statuses
// without reaching for a wider color palette.
export const STATUS_BADGE_PROPS: Record<
  FeedbackStatus,
  Pick<BadgeProps, "color" | "variant">
> = {
  new: { color: "trail-green", variant: "filled" },
  triaged: { color: "trail-green", variant: "outline" },
  planned: { color: "bark-brown", variant: "filled" },
  in_progress: { color: "trail-dust", variant: "filled" },
  completed: { color: "stone-gray", variant: "outline" },
  declined: { color: "stone-gray", variant: "outline" },
  duplicate: { color: "stone-gray", variant: "dot" },
};
