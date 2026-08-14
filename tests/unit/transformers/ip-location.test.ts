import { transform } from "$/transformers/ip-location";
import type { CityResponse } from "maxmind";
import { describe, expect, it } from "bun:test";

describe("transform", () => {
  it("returns the expected shape", () => {
    const item: CityResponse = {
      city: { geoname_id: 5128581, names: { en: "New York" } },
      country: {
        geoname_id: 6252001,
        iso_code: "US",
        names: { en: "United States" },
      },
      subdivisions: [
        { geoname_id: 5128638, iso_code: "NY", names: { en: "New York" } },
      ],
    };

    expect(transform(item)).toEqual({
      city: "New York",
      country: "United States",
      subdivisions: ["New York"],
    });
  });

  it("falls back to null city and country when missing", () => {
    const item: CityResponse = {};

    expect(transform(item)).toEqual({
      city: null,
      country: null,
      subdivisions: [],
    });
  });

  it("collects multiple subdivision names in order", () => {
    const item: CityResponse = {
      subdivisions: [
        { geoname_id: 1, iso_code: "A", names: { en: "Alpha" } },
        { geoname_id: 2, iso_code: "B", names: { en: "Beta" } },
      ],
    };

    expect(transform(item)).toMatchObject({
      subdivisions: ["Alpha", "Beta"],
    });
  });

  it("defaults to an empty array when subdivisions is missing", () => {
    const item: CityResponse = { subdivisions: undefined };

    expect(transform(item)).toMatchObject({
      subdivisions: [],
    });
  });
});
