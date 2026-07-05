import { moveTripsToFinished } from "$/jobs/workers/trip-status/move-to-finished";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

describe("moveTripsToFinished", () => {
  it("moves an in_progress trip that ended yesterday to finished", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedTripIds).toContain(trip.id);
    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("finished");
  });

  it("does not move an in_progress trip that ends today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("does not move an in_progress trip that ended two days ago", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-13"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("includes the very start of yesterday's UTC day and excludes the very start of today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const startOfYesterday = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });
    const startOfToday = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedTripIds).toContain(startOfYesterday.id);
    expect(result.changedTripIds).not.toContain(startOfToday.id);
  });

  it("does not move trips with a different status even if they ended yesterday", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "postponed",
        end: new Date("2026-06-14"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("postponed");
  });

  it("returns the ids and count of every trip it moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trips = await Promise.all([
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
    ]);

    const result = await moveTripsToFinished(now);

    expect(result.changedCount).toBe(trips.length);
    expect(result.changedTripIds.sort()).toEqual(
      trips.map((trip) => trip.id).sort(),
    );
  });

  it("moves every matching trip across multiple batches", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const count = 1200;
    await db.trip.createMany({
      data: Array.from({ length: count }, (_, i) =>
        make("Trip", {
          userId,
          name: `Batch trip ${i}`,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      ),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedCount).toBe(count);
    const remainingInProgress = await db.trip.count({
      where: {
        status: "in_progress",
        end: {
          gte: new Date("2026-06-14T00:00:00.000Z"),
          lt: new Date("2026-06-15T00:00:00.000Z"),
        },
      },
    });
    expect(remainingInProgress).toBe(0);
  });
});
