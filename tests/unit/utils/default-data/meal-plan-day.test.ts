import { createDefaultMealPlan } from "$/frontend/utils/default-data/meal-plan-day";
import { describe, expect, it, mock } from "bun:test";
import makeTrip from "../../../helpers/test-data/generators/trip";

function makeTransaction() {
  const create = mock((_args: { data: unknown }) => Promise.resolve());
  return { transaction: { mealPlanDay: { create } } as any, create };
}

describe("createDefaultMealPlan", () => {
  it("creates a single undated day when the trip has no start or end date", async () => {
    const trip = makeTrip({ start: undefined, end: undefined });
    const { transaction, create } = makeTransaction();

    await createDefaultMealPlan(trip, transaction);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      data: { tripId: trip.id, dayNumber: 1, date: undefined },
    });
  });

  it("creates a single day anchored to the start date when there is no end date", async () => {
    const trip = makeTrip({ start: new Date("2026-06-10"), end: undefined });
    const { transaction, create } = makeTransaction();

    await createDefaultMealPlan(trip, transaction);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      data: {
        tripId: trip.id,
        dayNumber: 1,
        date: new Date("2026-06-10"),
      },
    });
  });

  it("creates a single undated day when there is an end date but no start date", async () => {
    const trip = makeTrip({ start: undefined, end: new Date("2026-06-10") });
    const { transaction, create } = makeTransaction();

    await createDefaultMealPlan(trip, transaction);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toEqual({
      data: { tripId: trip.id, dayNumber: 1, date: undefined },
    });
  });

  it("creates a single day when start and end fall on the same date", async () => {
    const trip = makeTrip({
      start: new Date("2026-06-10"),
      end: new Date("2026-06-10"),
    });
    const { transaction, create } = makeTransaction();

    await createDefaultMealPlan(trip, transaction);

    expect(create).toHaveBeenCalledTimes(1);
  });

  it("creates one day per calendar day of the trip, including the end date", async () => {
    const trip = makeTrip({
      start: new Date("2026-06-10"),
      end: new Date("2026-06-13"),
    });
    const { transaction, create } = makeTransaction();

    await createDefaultMealPlan(trip, transaction);

    expect(create).toHaveBeenCalledTimes(4);
    expect(create.mock.calls.map((call) => call[0]?.data)).toEqual([
      { tripId: trip.id, dayNumber: 1, date: new Date("2026-06-10") },
      { tripId: trip.id, dayNumber: 2, date: new Date("2026-06-11") },
      { tripId: trip.id, dayNumber: 3, date: new Date("2026-06-12") },
      { tripId: trip.id, dayNumber: 4, date: new Date("2026-06-13") },
    ]);
  });
});
