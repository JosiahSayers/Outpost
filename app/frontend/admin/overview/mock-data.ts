// Placeholder figures for the overview hub, standing in until the tools they
// describe (BTP-57 sessions, BTP-60 queues, BTP-61 flags) have real endpoints
// to query.

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  "/console/users":
    "Look up any account by name or email — the entry point for impersonation, resets, and sessions.",
  "/console/audit-log":
    "Every impersonation, password reset, and session revocation, searchable by admin or user.",
  "/console/demo-account":
    "Reset demo@outpost.app to its seeded state for support and sales walkthroughs.",
  "/console/queues":
    "BullMQ dashboard — 3 queues, 16 waiting, 1 failed job needing attention.",
  "/console/feature-flags":
    "Toggle rollouts and kill switches without a deploy. 2 of 5 flags live.",
};
