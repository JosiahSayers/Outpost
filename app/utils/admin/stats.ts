import { registry } from "$/jobs/registry";
import { db } from "$/utils/db";
import { DateTime } from "luxon";

export const supportedStats = [
  "total_users",
  "active_sessions",
  "failed_jobs",
  "incomplete_meals",
] as const;

export const statSort: Record<SupportedStat, number> = {
  total_users: 1,
  active_sessions: 3,
  failed_jobs: 4,
  incomplete_meals: 5,
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
    case "failed_jobs":
      return getFailedJobs();
    case "incomplete_meals":
      return getPublicMeals();
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

async function getPublicMeals(): Promise<AdminStat> {
  const incompleteCount = await db.publicMealItem.count({
    where: {
      OR: [
        { dryWeightGrams: null },
        { waterMl: null },
        { calories: null },
        { sourceImageUrl: null },
      ],
    },
  });

  return {
    stat: "incomplete_meals",
    label: "Incomplete Meals",
    value: incompleteCount.toString(),
    delta: `${incompleteCount} meals need your attention`,
    trend: incompleteCount > 0 ? "down" : "up",
    sort: statSort["incomplete_meals"],
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
  let failedJobCount = 0;
  for (const job of registry) {
    const failedCount = (await job.queue.getFailedCount()) ?? 0;
    failedJobCount += failedCount;
  }

  const delta =
    failedJobCount > 0
      ? `${failedJobCount} jobs need your attention`
      : "Jobs are looking good";

  return {
    stat: "failed_jobs",
    label: "Failed Jobs",
    value: failedJobCount.toString(),
    delta,
    trend: failedJobCount > 0 ? "down" : "up",
    sort: statSort["failed_jobs"],
  };
}

function getStartOfWeek() {
  const today = DateTime.now();
  const startOfWeek = today.startOf("day").minus({ days: today.weekday % 7 });
  return startOfWeek.toJSDate();
}
