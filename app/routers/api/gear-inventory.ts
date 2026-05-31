import { requireValidSession } from "$/middleware/require-valid-session";
import { db } from "$/utils/db";
import { createGearInventoryItemValidator } from "$/validation/gear-inventory";
import { Router } from "express";
import validate from "express-zod-safe";
import type { GearCategory } from "../../../generated/prisma/client";
import { transform } from "$/transformers/gear-inventory-item";

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
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json({ item: transform(newItem) });
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
  return res.json({ items: items.map(transform) });
});
