import z from "zod";

export const editTripSafetyInfo = z.strictObject({
  emergencyContactName: z.string().trim().max(50).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  expectedDepartureTime: z.string().trim().max(10).optional(),
  expectedReturnTime: z.string().trim().max(10).optional(),
  medicalNotes: z.string().trim().max(500).optional(),
  permitOrRouteNumber: z.string().trim().max(50).optional(),
  rangerStationName: z.string().trim().max(50).optional(),
  rangerStationPhone: z.string().trim().max(20).optional(),
  vehicleDescription: z.string().trim().max(100).optional(),
});
