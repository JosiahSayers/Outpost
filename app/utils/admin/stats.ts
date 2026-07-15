import { db } from "$/utils/db";
import { DateTime } from "luxon";

export const supportedStats = [
  "total_users",
  "banned_users",
  "active_sessions",
  "failed_jobs",
] as const;

export const statSort: Record<SupportedStat, number> = {
  total_users: 1,
  banned_users: 2,
  active_sessions: 3,
  failed_jobs: 4,
} as const;

export type SupportedStat = (typeof supportedStats)[number];

export interface AdminStat {
  stat: SupportedStat;
  label: string;
  value: string;
  delta: string | null;
  trend: "up" | "constant" | "down" | null;
  sort: number;
}

export async function getStat(stat: SupportedStat): Promise<AdminStat> {
  switch (stat) {
    case "total_users":
      return getTotalUsers();
    case "active_sessions":
      return getActiveSessions();
    case "banned_users":
      return getBannedUsers();
    case "failed_jobs":
      return getFailedJobs();
  }
}

async function getTotalUsers(): Promise<AdminStat> {
  const [totalCount, newCount] = await db.$transaction([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: getStartOfWeek() } } }),
  ]);

  return {
    stat: "total_users",
    label: "Total Users",
    value: `${totalCount}`,
    delta: `+${newCount} this week`,
    trend: newCount > 0 ? "up" : null,
    sort: statSort["total_users"],
  };
}

async function getBannedUsers(): Promise<AdminStat> {
  const totalBanned = await db.user.count({ where: { banned: true } });

  return {
    stat: "banned_users",
    label: "Banned Users",
    value: `${totalBanned}`,
    delta: null,
    trend: null,
    sort: statSort["banned_users"],
  };
}

async function getActiveSessions(): Promise<AdminStat> {
  const [activeSessionCount, newSessionCount] = await db.$transaction([
    db.session.count({
      where: { expiresAt: { gt: new Date() } },
    }),
    db.session.count({
      where: {
        expiresAt: { gt: new Date() },
        createdAt: { gte: getStartOfWeek() },
      },
    }),
  ]);

  return {
    stat: "active_sessions",
    label: "Active Sessions",
    value: `${activeSessionCount}`,
    delta: `+${newSessionCount} this week`,
    trend: newSessionCount > 0 ? "up" : null,
    sort: statSort["active_sessions"],
  };
}

async function getFailedJobs(): Promise<AdminStat> {
  // TODO: This needs implemented still

  return {
    stat: "failed_jobs",
    label: "Failed Jobs",
    value: "0",
    delta: null,
    trend: null,
    sort: statSort["failed_jobs"],
  };
}

function getStartOfWeek() {
  const today = DateTime.now();
  const startOfWeek = today.startOf("day").minus({ days: today.weekday % 7 });
  return startOfWeek.toJSDate();
}
