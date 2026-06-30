import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import {
  getHighestSort,
  newPositionIsNotLastPosition,
  sendOutOfOrderResponse,
} from "$/utils/sorting";
import {
  createItem,
  itemParams,
  updateItem,
} from "$/validation/packing-list/item";
import { sectionParams } from "$/validation/packing-list/section";
import { Router } from "express";
import validate from "express-zod-safe";
import type { PackingListItem } from "../../../../generated/prisma/client";

export const itemsRouter = Router({ mergeParams: true });

itemsRouter.post(
  "/",
  validate({ body: createItem, params: sectionParams }),
  async (req, res) => {
    const existingItems = await db.packingListItem.findMany({
      where: {
        packingListSectionId: Number(req.params.sectionId),
      },
    });

    const currentHighestSort = getHighestSort(existingItems);

    if (
      newPositionIsNotLastPosition(currentHighestSort, req.body.sortPosition)
    ) {
      return sendOutOfOrderResponse(
        res,
        currentHighestSort,
        req.body.sortPosition,
      );
    }

    if (existingItems.find((item) => item.name === req.body.name)) {
      return res.status(400).json({
        error: `"${req.body.name}" is already an item in this section`,
      });
    }

    const newItem = await db.packingListItem.create({
      data: {
        name: req.body.name,
        quantity: req.body.quantity,
        optional: req.body.optional,
        sortPosition: req.body.sortPosition ?? currentHighestSort + 1,
        packingListSectionId: Number(req.params.sectionId),
        gearInventoryItemId: req.body.assignedGearId,
        gearCategoryId: req.body.gearCategoryId,
      },
    });

    return res
      .status(201)
      .json({ item: transformers.packingListItem(newItem) });
  },
);

itemsRouter.delete(
  "/:itemId",
  validate({ params: itemParams }),
  async (req, res) => {
    const item = await db.packingListItem.findUnique({
      where: {
        id: Number(req.params.itemId),
        packingListSectionId: Number(req.params.sectionId),
      },
    });

    if (!item) {
      return res.sendStatus(404);
    }

    await db.packingListItem.delete({
      where: {
        id: Number(req.params.itemId),
      },
    });

    return res.sendStatus(200);
  },
);

itemsRouter.patch(
  "/:itemId",
  validate({ body: updateItem, params: itemParams }),
  async (req, res) => {
    const existingItems = await db.packingListItem.findMany({
      where: {
        packingListSectionId: Number(req.params.sectionId),
      },
    });

    const itemToUpdate = existingItems.find(
      (i) => i.id === Number(req.params.itemId),
    );

    if (!itemToUpdate) {
      return res.sendStatus(404);
    }

    const currentHighestSort = getHighestSort(existingItems);
    let updatedItem: PackingListItem;

    await db.$transaction(async (tx) => {
      if (
        newPositionIsNotLastPosition(currentHighestSort, req.body.sortPosition)
      ) {
        const itemsToIncrement = existingItems.filter(
          (i) => i.sortPosition >= req.body.sortPosition!,
        );
        for (const item of itemsToIncrement) {
          await tx.packingListItem.update({
            where: { id: item.id },
            data: { sortPosition: item.sortPosition + 1 },
          });
        }
      }

      updatedItem = await tx.packingListItem.update({
        where: { id: Number(req.params.itemId) },
        data: {
          name: req.body.name,
          quantity: req.body.quantity,
          optional: req.body.optional,
          sortPosition: req.body.sortPosition ?? currentHighestSort + 1,
          packingListSectionId: Number(req.params.sectionId),
          gearInventoryItemId: req.body.assignedGearId,
          gearCategoryId: req.body.gearCategoryId,
        },
      });
    });

    return res.json({
      item: transformers.packingListItem(updatedItem!),
    });
  },
);
