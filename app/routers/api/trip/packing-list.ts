import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import {
  assignPackingList,
  tripPackingListParams,
} from "$/validation/trip/packing-list";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripPackingListRouter = Router({ mergeParams: true });

tripPackingListRouter.post(
  "/",
  validate({ params: idParam, body: assignPackingList }),
  async (req, res) => {
    const existingTripPackingList = await db.tripPackingList.findUnique({
      where: {
        tripId: req.params.id,
      },
    });

    if (existingTripPackingList) {
      return res.status(409).json({
        error: `Trip already has a packing list assigned`,
      });
    }

    const packingList = await db.packingList.findUnique({
      where: {
        id: req.body.packingListId,
        userId: req.session!.user.id,
      },
    });

    if (!packingList) {
      return res.status(404).json({
        error: `Unable to find packing list with id ${req.body.packingListId}`,
      });
    }

    const tripPackingList = await db.tripPackingList.create({
      data: {
        tripId: req.params.id,
        packingListId: req.body.packingListId,
      },
      include: {
        packingList: {
          include: {
            packingListSections: {
              include: {
                items: {
                  include: {
                    tripPackingListItemStatuses: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res
      .status(201)
      .json({ tripPackingList: transformers.tripPackingList(tripPackingList) });
  },
);

tripPackingListRouter.delete(
  "/:listId",
  validate({ params: tripPackingListParams }),
  async (req, res) => {
    const tripPackingList = await db.tripPackingList.findUnique({
      where: {
        tripId: req.params.id,
        packingListId: req.params.listId,
      },
    });

    if (!tripPackingList) {
      return res.status(404).json({
        error: `Unable to find packing list (${req.params.listId}) on this trip (${req.params.id})`,
      });
    }

    await db.tripPackingList.delete({
      where: {
        tripId: req.params.id,
        packingListId: req.params.listId,
      },
    });

    return res.sendStatus(200);
  },
);
