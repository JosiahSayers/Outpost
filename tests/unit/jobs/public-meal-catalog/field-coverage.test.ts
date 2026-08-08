import {
  createFieldCoverageTracker,
  detectSystemicFieldFailures,
} from "$/jobs/workers/public-meal-catalog/field-coverage";
import { describe, expect, it } from "bun:test";

describe("createFieldCoverageTracker", () => {
  it("starts every tracked field at zero", () => {
    const tracker = createFieldCoverageTracker(["calories", "waterMl"]);
    expect(tracker.counts()).toEqual({ calories: 0, waterMl: 0 });
  });

  it("increments a field's count when a record has it null", () => {
    const tracker = createFieldCoverageTracker(["calories", "waterMl"]);
    tracker.record({ calories: null, waterMl: 200 });
    tracker.record({ calories: null, waterMl: null });
    expect(tracker.counts()).toEqual({ calories: 2, waterMl: 1 });
  });

  it("treats undefined the same as null", () => {
    const tracker = createFieldCoverageTracker(["calories"]);
    tracker.record({});
    expect(tracker.counts()).toEqual({ calories: 1 });
  });

  it("does not increment a field that has a value", () => {
    const tracker = createFieldCoverageTracker(["calories"]);
    tracker.record({ calories: 700 });
    expect(tracker.counts()).toEqual({ calories: 0 });
  });
});

describe("detectSystemicFieldFailures", () => {
  it("returns fields that were null for every processed item", () => {
    const result = detectSystemicFieldFailures({ calories: 5, waterMl: 2 }, 5);
    expect(result).toEqual(["calories"]);
  });

  it("returns an empty array when no field failed for every item", () => {
    const result = detectSystemicFieldFailures({ calories: 4, waterMl: 0 }, 5);
    expect(result).toEqual([]);
  });

  it("returns an empty array below the minimum run size, even at 100% null", () => {
    const result = detectSystemicFieldFailures({ calories: 2 }, 2, 3);
    expect(result).toEqual([]);
  });

  it("triggers right at the minimum run size", () => {
    const result = detectSystemicFieldFailures({ calories: 3 }, 3, 3);
    expect(result).toEqual(["calories"]);
  });

  it("can return multiple failed fields", () => {
    const result = detectSystemicFieldFailures(
      { calories: 4, waterMl: 4, dryWeightGrams: 1 },
      4,
    );
    expect(result.sort()).toEqual(["calories", "waterMl"]);
  });
});
