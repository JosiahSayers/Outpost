import { processProductImage } from "$/jobs/workers/public-meal-catalog/image";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import { searchPublicMealItems } from "$/utils/search-helpers";
import {
  createMeal,
  deleteMealSearchParams,
  editMeal,
  incompleteParams,
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
  "/incomplete",
  validate({ query: incompleteParams }),
  async (req, res) => {
    const where = {
      // A manually ready-overridden item is a resolved item, not open work
      // -- it belongs in the "Manually marked ready" list, not this queue.
      readyOverride: false,
      OR: [
        { brand: null },
        { calories: null },
        { waterMl: null },
        { dryWeightGrams: null },
        { imageId: null },
        { sourceImageUrl: null },
      ],
    };
    const [incompleteMeals, incompleteCount] = await db.$transaction([
      db.publicMealItem.findMany({
        where,
        include: {
          image: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: req.query.skip,
        take: req.query.take,
      }),
      db.publicMealItem.count({ where }),
    ]);

    const page = paginate(
      incompleteMeals,
      transformers.admin.publicMealItem,
      incompleteCount,
      req.query.take,
    );

    return res.json(page);
  },
);

adminMealsRouter.get(
  "/ready-override",
  validate({ query: incompleteParams }),
  async (req, res) => {
    const where = { readyOverride: true };
    const [readyOverrideMeals, readyOverrideCount] = await db.$transaction([
      db.publicMealItem.findMany({
        where,
        include: {
          image: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: req.query.skip,
        take: req.query.take,
      }),
      db.publicMealItem.count({ where }),
    ]);

    const page = paginate(
      readyOverrideMeals,
      transformers.admin.publicMealItem,
      readyOverrideCount,
      req.query.take,
    );

    return res.json(page);
  },
);

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
      items: items.map(transformers.admin.publicMealItem),
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
        readyOverride: req.body.readyOverride ?? false,
        imageId,
      },
      include: {
        image: true,
      },
    });
  });

  return res.json(transformers.admin.publicMealItem(newMeal));
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
      let imageId = existing.imageId;
      // `undefined` means "don't touch the column". The form always resends
      // sourceImageUrl (prefilled with whatever's currently in effect), so
      // presence alone doesn't mean the admin changed the photo -- compare
      // against the currently *effective* url (override, if any, else the
      // tracked source) to tell an actual edit from a resubmitted no-op and
      // avoid reprocessing the image on every unrelated field edit.
      let overrideImageUrl: string | null | undefined = undefined;
      const currentEffectiveImageUrl =
        existing.overrideImageUrl ?? existing.sourceImageUrl;

      if (
        req.body.sourceImageUrl &&
        req.body.sourceImageUrl !== currentEffectiveImageUrl
      ) {
        const desiredImageUrl = req.body.sourceImageUrl;
        const imageResult = await processProductImage(
          {
            sourceVendor: existing.sourceVendor,
            sourceProductId: existing.sourceProductId,
            imageUrl: desiredImageUrl,
            existing,
          },
          {
            fetchImpl: fetch,
            logger: logger,
          },
        );
        imageId = imageResult.imageId;
        // `sourceImageUrl` (the vendor's own tracked source) is intentionally
        // never written here -- it's ingest-owned bookkeeping (BTP-136). Only
        // record an override when it actually diverges from that source;
        // matching it back is the admin reverting to the vendor's photo.
        overrideImageUrl =
          desiredImageUrl === existing.sourceImageUrl ? null : desiredImageUrl;
      }

      return tx.publicMealItem.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          brand: req.body.brand,
          calories: req.body.calories,
          waterMl: req.body.waterMl,
          dryWeightGrams: req.body.dryWeightGrams,
          sourceVendor: req.body.sourceVendor,
          sourceProductId: req.body.sourceProductId,
          sourceUrl: req.body.sourceUrl,
          readyOverride: req.body.readyOverride,
          imageId,
          ...(overrideImageUrl !== undefined ? { overrideImageUrl } : {}),
        },
        include: {
          image: true,
        },
      });
    });

    return res.json(transformers.admin.publicMealItem(updatedMeal));
  },
);

// delete
adminMealsRouter.delete(
  "/:id",
  validate({ params: idParam, query: deleteMealSearchParams }),
  async (req, res) => {
    const existing = await db.publicMealItem.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.sendStatus(404);
    }

    await db.$transaction(async (tx) => {
      if (req.query.ignore.toLowerCase() === "true") {
        await tx.ignoredPublicMealItem.create({
          data: {
            sourceProductId: existing.sourceProductId,
            sourceVendor: existing.sourceVendor,
            ignoredById: req.session!.user.id,
          },
        });
      }
      await tx.publicMealItem.delete({ where: { id: req.params.id } });
    });

    return res.sendStatus(200);
  },
);
