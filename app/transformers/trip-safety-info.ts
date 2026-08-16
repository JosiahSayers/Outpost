import type { TripSafetyInfo } from "../../generated/prisma/browser";

export type ClientTripSafetyInfo = Pick<
  TripSafetyInfo,
  | "emergencyContactName"
  | "emergencyContactPhone"
  | "epxectedReturnTime"
  | "expectedDepartureTime"
  | "id"
  | "medicalNotes"
  | "permitOrRouteNumber"
  | "rangerStationName"
  | "rangerStationPhone"
  | "vehicleDescription"
>;

export function transform(item: TripSafetyInfo): ClientTripSafetyInfo {
  return {
    id: item.id,
    emergencyContactName: item.emergencyContactName,
    emergencyContactPhone: item.emergencyContactPhone,
    expectedDepartureTime: item.expectedDepartureTime,
    epxectedReturnTime: item.epxectedReturnTime,
    medicalNotes: item.medicalNotes,
    permitOrRouteNumber: item.permitOrRouteNumber,
    rangerStationName: item.rangerStationName,
    rangerStationPhone: item.rangerStationPhone,
    vehicleDescription: item.vehicleDescription,
  };
}
