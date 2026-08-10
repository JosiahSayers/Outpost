import { processProductImage } from "$/jobs/workers/public-meal-catalog/image";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import { searchPublicMealItems } from "$/utils/search-helpers";
import {
  createMeal,
  editMeal,
  mealSearchParams,
} from "$/validation/admin/meals";
import { idParam } from "$/validation/shared";
import { Router } from "express";
import validate from "express-zod-safe";

export const adminMealsRouter = Router();

adminMealsRouter.get("/established-metadata", async (req, res) => {
  const [uniqueVendors, uniqueBrands] = await db.$transaction([
    db.publicMealItem.findMany({
      distinct: ["sourceVendor"],
      select: {
        sourceVendor: true,
      },
    }),
    db.publicMealItem.findMany({
      distinct: ["brand"],
      select: {
        brand: true,
      },
    }),
  ]);

  return res.json({
    vendors: uniqueVendors.map((vendor) => vendor.sourceVendor),
    brands: uniqueBrands.map((brand) => brand.brand),
  });
});

adminMealsRouter.get(
  "/",
  validate({ query: mealSearchParams }),
  async (req, res) => {
    const { items, hasMore } = await searchPublicMealItems(req.query.query, {
      vendor: req.query.vendor,
      brand: req.query.brand,
      take: req.query.take,
      skip: req.query.skip,
    });

    return res.json({
      items: items.map(transformers.publicMealItemSummary),
      hasMore,
    });
  },
);

adminMealsRouter.post("/", validate({ body: createMeal }), async (req, res) => {
  const newMeal = await db.$transaction(async (tx) => {
    let imageId: string | null = null;

    if (req.body.sourceImageUrl) {
      const imageResult = await processProductImage(
        {
          sourceVendor: req.body.sourceVendor,
          sourceProductId: req.body.sourceProductId,
          imageUrl: req.body.sourceImageUrl,
          existing: null,
        },
        {
          fetchImpl: fetch,
          logger: logger,
        },
      );
      imageId = imageResult.imageId;
    }

    return tx.publicMealItem.create({
      data: {
        name: req.body.name,
        brand: req.body.brand,
        calories: req.body.calories,
        waterMl: req.body.waterMl,
        dryWeightGrams: req.body.dryWeightGrams,
        sourceImageUrl: req.body.sourceImageUrl,
        sourceVendor: req.body.sourceVendor,
        sourceProductId: req.body.sourceProductId,
        sourceUrl: req.body.sourceUrl,
        imageId,
      },
      include: {
        image: true,
      },
    });
  });

  return res.json(transformers.publicMealItemSummary(newMeal));
});

adminMealsRouter.patch(
  "/:id",
  validate({ body: editMeal, params: idParam }),
  async (req, res) => {
    const existing = await db.publicMealItem.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.sendStatus(404);
    }

    const updatedMeal = await db.$transaction(async (tx) => {
      let imageId: string | null = null;

      if (req.body.sourceImageUrl) {
        const imageResult = await processProductImage(
          {
            sourceVendor: existing.sourceVendor,
            sourceProductId: existing.sourceProductId,
            imageUrl: req.body.sourceImageUrl,
            existing,
          },
          {
            fetchImpl: fetch,
            logger: logger,
          },
        );
        imageId = imageResult.imageId;
      }

      return tx.publicMealItem.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          brand: req.body.brand,
          calories: req.body.calories,
          waterMl: req.body.waterMl,
          dryWeightGrams: req.body.dryWeightGrams,
          sourceImageUrl: req.body.sourceImageUrl,
          sourceVendor: req.body.sourceVendor,
          sourceProductId: req.body.sourceProductId,
          sourceUrl: req.body.sourceUrl,
          imageId,
        },
        include: {
          image: true,
        },
      });
    });

    return res.json(transformers.publicMealItemSummary(updatedMeal));
  },
);

// delete
adminMealsRouter.delete(
  "/:id",
  validate({ params: idParam }),
  async (req, res) => {
    const existing = await db.publicMealItem.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.sendStatus(404);
    }

    await db.publicMealItem.delete({ where: { id: req.params.id } });
    return res.sendStatus(200);
  },
);
