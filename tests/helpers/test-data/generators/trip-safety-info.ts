import { faker } from "@faker-js/faker";
import type { TripSafetyInfo } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripSafetyInfo(
  overrides: OptionalPartial<TripSafetyInfo> = {},
): TripSafetyInfo {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    emergencyContactName: faker.person.fullName(),
    emergencyContactPhone: faker.phone.number(),
    rangerStationName: faker.company.name(),
    rangerStationPhone: faker.phone.number(),
    expectedDepartureTime: "08:00",
    expectedReturnTime: "17:00",
    vehicleDescription: faker.vehicle.vehicle(),
    permitOrRouteNumber: faker.string.alphanumeric(8),
    medicalNotes: faker.lorem.sentence(),
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
