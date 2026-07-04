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
      start: trip.start,
      end: trip.end,
    });
  });
});
