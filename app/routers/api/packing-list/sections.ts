import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import {
  createSection,
  sectionParams,
  updateSection,
} from "$/validation/packing-list/section";
import { idParam } from "$/validation/shared";
import { Router } from "express";
import validate from "express-zod-safe";

export const sectionsRouter = Router({ mergeParams: true });

sectionsRouter.post(
  "/",
  validate({ body: createSection, params: idParam }),
  async (req, res) => {
    const existingSections = await db.packingListSection.findMany({
      where: { packingListId: Number(req.params.id) },
    });

    const currentHighestSort =
      Math.max(...existingSections.map((s) => s.sortPosition)) ?? 0;

    console.log({ currentHighestSort, pos: req.body.sortPosition });

    if (
      req.body.sortPosition != undefined &&
      req.body.sortPosition <= currentHighestSort
    ) {
      return res.status(400).json({
        error: `"sortPosition" should be higher than the current highest sort position. You provided: ${req.body.sortPosition}, currentHighest: ${currentHighestSort}`,
      });
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

    const currentHighestSort =
      Math.max(...existingSections.map((s) => s.sortPosition)) ?? 0;

    if (
      req.body.sortPosition != undefined &&
      req.body.sortPosition <= currentHighestSort
    ) {
      // Find sections that are greater than or equal to the new sort position
      const sectionsToIncrement = existingSections.filter(
        (s) => s.sortPosition >= req.body.sortPosition!,
      );
      // Increment the sort position for all filtered sections
      for (const section of sectionsToIncrement) {
        await db.packingListSection.update({
          where: { id: section.id },
          data: { sortPosition: section.sortPosition + 1 },
        });
      }
    }

    const updatedSection = await db.packingListSection.update({
      where: { id: Number(req.params.sectionId) },
      data: {
        name: req.body.name,
        sortPosition: req.body.sortPosition,
      },
    });

    return res.json({
      section: transformers.packingListSection(updatedSection),
    });
  },
);
