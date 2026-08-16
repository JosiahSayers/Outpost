import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import { editTripSafetyInfo } from "$/validation/trip/safety-info";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripSafetyInfoRouter = Router({ mergeParams: true });

tripSafetyInfoRouter.put(
  "/",
  validate({ params: idParam, body: editTripSafetyInfo }),
  async (req, res) => {
    const data = {
      emergencyContactName: req.body.emergencyContactName,
      emergencyContactPhone: req.body.emergencyContactPhone,
      rangerStationName: req.body.rangerStationName,
      rangerStationPhone: req.body.rangerStationPhone,
      expectedDepartureTime: req.body.expectedDepartureTime,
      expectedReturnTime: req.body.expectedReturnTime,
      vehicleDescription: req.body.vehicleDescription,
      permitOrRouteNumber: req.body.permitOrRouteNumber,
      medicalNotes: req.body.medicalNotes,
    };
    const safetyInfo = await db.tripSafetyInfo.upsert({
      where: { tripId: req.params.id },
      update: data,
      create: {
        ...data,
        tripId: req.params.id,
      },
    });

    return res.json({ safetyInfo: transformers.tripSafetyInfo(safetyInfo) });
  },
);
