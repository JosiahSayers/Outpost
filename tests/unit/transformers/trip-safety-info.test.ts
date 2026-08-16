import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape", () => {
    const info = make("TripSafetyInfo");
    expect(transformers.tripSafetyInfo(info)).toEqual({
      id: info.id,
      emergencyContactName: info.emergencyContactName,
      emergencyContactPhone: info.emergencyContactPhone,
      rangerStationName: info.rangerStationName,
      rangerStationPhone: info.rangerStationPhone,
      expectedDepartureTime: info.expectedDepartureTime,
      expectedReturnTime: info.expectedReturnTime,
      vehicleDescription: info.vehicleDescription,
      permitOrRouteNumber: info.permitOrRouteNumber,
      medicalNotes: info.medicalNotes,
    });
  });

  it("does not leak internal fields", () => {
    const info = make("TripSafetyInfo");
    const result = transformers.tripSafetyInfo(info);
    expect(result).not.toHaveProperty("tripId");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("updatedAt");
  });

  it("passes through null optional fields", () => {
    const info = make("TripSafetyInfo", {
      emergencyContactName: null,
      emergencyContactPhone: null,
      rangerStationName: null,
      rangerStationPhone: null,
      expectedDepartureTime: null,
      expectedReturnTime: null,
      vehicleDescription: null,
      permitOrRouteNumber: null,
      medicalNotes: null,
    });
    expect(transformers.tripSafetyInfo(info)).toMatchObject({
      emergencyContactName: null,
      emergencyContactPhone: null,
      rangerStationName: null,
      rangerStationPhone: null,
      expectedDepartureTime: null,
      expectedReturnTime: null,
      vehicleDescription: null,
      permitOrRouteNumber: null,
      medicalNotes: null,
    });
  });
});
