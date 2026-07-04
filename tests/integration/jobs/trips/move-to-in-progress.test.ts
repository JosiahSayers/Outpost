import { moveTripsToInProgress } from "$/jobs/workers/trip-status/move-to-in-progress";
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

describe("moveTripsToInProgress", () => {
  it("moves a planning trip that starts today to in_progress", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-15T08:00:00.000Z"),
      }),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedTripIds).toContain(trip.id);
    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("does not move a planning trip that starts yesterday", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-14T23:59:59.999Z"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("planning");
  });

  it("does not move a planning trip that starts tomorrow", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-16T00:00:00.000Z"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("planning");
  });

  it("includes the very start of the UTC day and excludes the very start of the next day", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const startOfDay = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-15T00:00:00.000Z"),
      }),
    });
    const startOfNextDay = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-16T00:00:00.000Z"),
      }),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedTripIds).toContain(startOfDay.id);
    expect(result.changedTripIds).not.toContain(startOfNextDay.id);
  });

  it("does not move trips with a different status even if they start today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "postponed",
        start: new Date("2026-06-15T08:00:00.000Z"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("postponed");
  });

  it("returns the ids and count of every trip it moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trips = await Promise.all([
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "planning",
          start: new Date("2026-06-15T01:00:00.000Z"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "planning",
          start: new Date("2026-06-15T02:00:00.000Z"),
        }),
      }),
    ]);

    const result = await moveTripsToInProgress(now);

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
          status: "planning",
          start: new Date("2026-06-15T06:00:00.000Z"),
        }),
      ),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedCount).toBe(count);
    const remainingPlanning = await db.trip.count({
      where: {
        status: "planning",
        start: {
          gte: new Date("2026-06-15T00:00:00.000Z"),
          lt: new Date("2026-06-16T00:00:00.000Z"),
        },
      },
    });
    expect(remainingPlanning).toBe(0);
  });
});
