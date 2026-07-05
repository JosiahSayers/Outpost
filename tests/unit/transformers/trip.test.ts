import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transform } from "$/transformers/trip";

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
