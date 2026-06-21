import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { createGearInventoryItemValidator } from "$/validation/gear-inventory";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import validate from "express-zod-safe";
import type { GearCategory } from "../../../generated/prisma/client";

export const gearInventoryRouter = Router();
gearInventoryRouter.use(requireValidSession);

gearInventoryRouter.post(
  "/",
  validate({ body: createGearInventoryItemValidator }),
  async (req, res) => {
    let category: GearCategory;

    if (req.body.newCategoryName) {
      category = await db.gearCategory.create({
        data: {
          name: req.body.newCategoryName,
          userId: req.session!.user.id,
        },
      });
    } else {
      const existing = await db.gearCategory.findUnique({
        where: { id: req.body.existingCategoryId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Unable to find category" });
      }

      category = existing;
    }

    const newItem = await db.gearInventoryItem.create({
      data: {
        name: req.body.name,
        quantity: req.body.quantity,
        userId: req.session!.user.id,
        gearCategoryId: category.id,
        grams: req.body.grams,
      },
      include: {
        category: true,
      },
    });

    return res
      .status(201)
      .json({ item: transformers.gearInventoryItem(newItem) });
  },
);

gearInventoryRouter.get("/", async (req, res) => {
  const items = await db.gearInventoryItem.findMany({
    where: {
      userId: req.session!.user.id,
    },
    include: {
      category: true,
    },
  });
  return res.json({ items: items.map(transformers.gearInventoryItem) });
});

gearInventoryRouter.delete("/:id", async (req, res) => {
  try {
    await db.gearInventoryItem.delete({
      where: { id: Number(req.params.id), userId: req.session!.user.id },
    });
    return res.sendStatus(200);
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.sendStatus(404);
    } else {
      req.logger.error("Error deleting gear inventory item", e);
      return res.sendStatus(500);
    }
  }
});
