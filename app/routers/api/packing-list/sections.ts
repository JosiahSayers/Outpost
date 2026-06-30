import { itemsRouter } from "$/routers/api/packing-list/section-items";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import {
  getHighestSort,
  newPositionIsNotLastPosition,
  sendOutOfOrderResponse,
} from "$/utils/sorting";
import {
  createSection,
  sectionParams,
  updateSection,
} from "$/validation/packing-list/section";
import { idParam } from "$/validation/shared";
import { Router } from "express";
import validate from "express-zod-safe";
import type { PackingListSection } from "../../../../generated/prisma/client";

export const sectionsRouter = Router({ mergeParams: true });

sectionsRouter.post(
  "/",
  validate({ body: createSection, params: idParam }),
  async (req, res) => {
    const existingSections = await db.packingListSection.findMany({
      where: { packingListId: Number(req.params.id) },
    });

    const currentHighestSort = getHighestSort(existingSections);

    if (
      newPositionIsNotLastPosition(currentHighestSort, req.body.sortPosition)
    ) {
      return sendOutOfOrderResponse(
        res,
        currentHighestSort,
        req.body.sortPosition,
      );
    }

    if (existingSections.find((s) => s.name === req.body.name)) {
      return res.status(400).json({
        error: `"${req.body.name}" is already a section on this packing list`,
      });
    }

    const newSection = await db.packingListSection.create({
      data: {
        name: req.body.name,
        sortPosition: req.body.sortPosition ?? currentHighestSort + 1,
        packingListId: Number(req.params.id),
      },
    });

    return res
      .status(201)
      .json({ section: transformers.packingListSection(newSection) });
  },
);

sectionsRouter.delete(
  "/:sectionId",
  validate({ params: sectionParams }),
  async (req, res) => {
    const section = await db.packingListSection.findUnique({
      where: {
        id: Number(req.params.sectionId),
        packingListId: Number(req.params.id),
      },
    });

    if (!section) {
      return res.sendStatus(404);
    }

    await db.packingListSection.delete({
      where: {
        id: Number(req.params.sectionId),
      },
    });

    return res.sendStatus(200);
  },
);

sectionsRouter.patch(
  "/:sectionId",
  validate({ params: sectionParams, body: updateSection }),
  async (req, res) => {
    const existingSections = await db.packingListSection.findMany({
      where: {
        packingListId: Number(req.params.id),
      },
    });

    const sectionToUpdate = existingSections.find(
      (s) => s.id === Number(req.params.sectionId),
    );

    if (!sectionToUpdate) {
      return res.sendStatus(404);
    }

    const currentHighestSort = getHighestSort(existingSections);
    let updatedSection: PackingListSection;

    await db.$transaction(async (tx) => {
      if (
        newPositionIsNotLastPosition(currentHighestSort, req.body.sortPosition)
      ) {
        // Find sections that are greater than or equal to the new sort position
        const sectionsToIncrement = existingSections.filter(
          (s) => s.sortPosition >= req.body.sortPosition!,
        );
        // Increment the sort position for all filtered sections
        for (const section of sectionsToIncrement) {
          await tx.packingListSection.update({
            where: { id: section.id },
            data: { sortPosition: section.sortPosition + 1 },
          });
        }
      }

      updatedSection = await tx.packingListSection.update({
        where: { id: Number(req.params.sectionId) },
        data: {
          name: req.body.name,
          sortPosition: req.body.sortPosition,
        },
      });
    });

    return res.json({
      section: transformers.packingListSection(updatedSection!),
    });
  },
);

sectionsRouter.use("/:sectionId/items", itemsRouter);
