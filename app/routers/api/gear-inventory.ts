import { userCanAccessGearInventoryItem } from "$/middleware/authorization/gear-inventory-item";
import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { createGearInventoryItemValidator, itemIdParamsValidator } from "$/validation/gear-inventory";
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
        where: {
          id: req.body.existingCategoryId,
          OR: [{ userId: req.session!.user.id }, { public: true }],
        },
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

gearInventoryRouter.put(
  "/:id",
  validate({ params: itemIdParamsValidator, body: createGearInventoryItemValidator }),
  userCanAccessGearInventoryItem,
  async (req, res) => {
    const existingItem = await db.gearInventoryItem.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true },
    });

    let newCategoryId: number;

    if (req.body.newCategoryName) {
      const newCategory = await db.gearCategory.create({
        data: {
          name: req.body.newCategoryName,
          userId: req.session!.user.id,
        },
      });
      newCategoryId = newCategory.id;
    } else {
      const existing = await db.gearCategory.findUnique({
        where: {
          id: req.body.existingCategoryId,
          OR: [{ userId: req.session!.user.id }, { public: true }],
        },
      });

      if (!existing) {
        return res.status(404).json({ error: "Unable to find category" });
      }

      newCategoryId = existing.id;
    }

    const oldCategoryId = existingItem!.gearCategoryId;

    const updatedItem = await db.gearInventoryItem.update({
      where: { id: Number(req.params.id) },
      data: {
        name: req.body.name,
        quantity: req.body.quantity,
        grams: req.body.grams,
        gearCategoryId: newCategoryId,
      },
      include: { category: true },
    });

    if (oldCategoryId !== newCategoryId && !existingItem!.category.public) {
      const remainingItems = await db.gearInventoryItem.count({
        where: { gearCategoryId: oldCategoryId },
      });

      if (remainingItems === 0) {
        await db.gearCategory.delete({ where: { id: oldCategoryId } });
      }
    }

    return res.json({ item: transformers.gearInventoryItem(updatedItem) });
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

gearInventoryRouter.delete(
  "/:id",
  userCanAccessGearInventoryItem,
  async (req, res) => {
    await db.gearInventoryItem.delete({
      where: { id: Number(req.params.id), userId: req.session!.user.id },
    });
    return res.sendStatus(200);
  },
);
