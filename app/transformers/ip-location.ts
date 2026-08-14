import type { CityResponse } from "maxmind";

export type ClientIpLocation = {
  city: string | null;
  country: string | null;
  subdivisions: string[];
};

export function transform(item: CityResponse): ClientIpLocation {
  return {
    city: item.city?.names.en ?? null,
    country: item.country?.names.en ?? null,
    subdivisions: item.subdivisions?.map((sd) => sd.names.en) ?? [],
  };
}
