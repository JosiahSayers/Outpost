import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transform, transformFull } from "$/transformers/trip";

function makeMealPlanDay() {
  const day = make("MealPlanDay");
  const breakfastItem = make("MealPlanItem", {
    mealPlanDayId: day.id,
    meal: "breakfast",
  });
  return {
    ...day,
    items: [breakfastItem],
  };
}

describe("transform", () => {
  it("returns the expected shape", () => {
    const trip = make("Trip");
    expect(transform(trip)).toEqual({
      id: trip.id,
      name: trip.name,
      trail: trip.trail,
      location: trip.location,
      status: trip.status,
      start: trip.start!.toISOString().slice(0, 10),
      end: trip.end!.toISOString().slice(0, 10),
    });
  });

  it("serializes null dates as null", () => {
    const trip = { ...make("Trip"), start: null, end: null };
    expect(transform(trip)).toMatchObject({ start: null, end: null });
  });
});

describe("transformFull", () => {
  it("returns the trip fields plus the transformed tasks", () => {
    const trip = make("Trip");
    const task1 = make("TripTask", { tripId: trip.id, phase: "before" });
    const task2 = make("TripTask", { tripId: trip.id, phase: "after" });
    const day = makeMealPlanDay();
    const link = make("TripLink", { tripId: trip.id });

    expect(
      transformFull({
        ...trip,
        tasks: [task1, task2],
        mealPlanDays: [day],
        links: [link],
      }),
    ).toEqual({
      ...transform(trip),
      tasks: [
        {
          id: task1.id,
          name: task1.name,
          complete: task1.complete,
          phase: task1.phase,
          dueDate: task1.dueDate!.toISOString().slice(0, 10),
        },
        {
          id: task2.id,
          name: task2.name,
          complete: task2.complete,
          phase: task2.phase,
          dueDate: task2.dueDate!.toISOString().slice(0, 10),
        },
      ],
      mealPlan: [
        {
          id: day.id,
          dayNumber: day.dayNumber,
          date: day.date!.toISOString().slice(0, 10),
          meals: {
            breakfast: [expect.objectContaining({ id: day.items[0]!.id })],
            lunch: [],
            dinner: [],
            snacks: [],
          },
        },
      ],
      links: [
        {
          id: link.id,
          audioUrl: link.audioUrl,
          description: link.description,
          imageUrl: link.imageUrl,
          name: link.name,
          siteName: link.siteName,
          type: link.type,
          url: link.url,
          videoUrl: link.videoUrl,
        },
      ],
    });
  });

  it("returns an empty tasks array when the trip has no tasks", () => {
    const trip = make("Trip");
    expect(
      transformFull({ ...trip, tasks: [], mealPlanDays: [], links: [] }),
    ).toMatchObject({
      tasks: [],
      links: [],
    });
  });
});
