import { tripLinkExists } from "$/middleware/authorization/trip-link";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { fetchOpenGraph } from "$/utils/open-graph";
import { idParam } from "$/validation/shared";
import { createLink, editLink, tripLinkParams } from "$/validation/trip/link";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripLinkRouter = Router({ mergeParams: true });

tripLinkRouter.post(
  "/",
  validate({ params: idParam, body: createLink }),
  async (req, res) => {
    const link = await db.tripLink.create({
      data: {
        url: req.body.url,
        tripId: req.params.id,
      },
    });

    try {
      const openGraph = await fetchOpenGraph(link.url);

      const withOpenGraph = await db.tripLink.update({
        where: { id: link.id },
        data: openGraph,
      });

      return res.json({ link: transformers.tripLink(withOpenGraph) });
    } catch {
      return res.json({ link: transformers.tripLink(link) });
    }
  },
);

tripLinkRouter.delete(
  "/:linkId",
  tripLinkExists,
  validate({ params: tripLinkParams }),
  async (req, res) => {
    await db.tripLink.delete({ where: { id: req.params.linkId } });
    return res.sendStatus(200);
  },
);

tripLinkRouter.patch(
  "/:linkId",
  tripLinkExists,
  validate({ params: tripLinkParams, body: editLink }),
  async (req, res) => {
    const updated = await db.tripLink.update({
      where: { id: req.params.linkId },
      data: {
        name: req.body.name,
        description: req.body.description,
      },
    });

    return res.json({ link: transformers.tripLink(updated) });
  },
);

// @ts-expect-error express types are wonky for error handling middleware
tripLinkRouter.use((err, req, res, next) => {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "That URL already exists on this trip" });
    }
  }

  return next();
});
