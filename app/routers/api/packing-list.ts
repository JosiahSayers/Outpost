import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { newPackingList, packingListSearch } from "$/validation/packing-list";
import { Router } from "express";
import validate from "express-zod-safe";
import type { PackingList } from "../../../generated/prisma/client";
import type { FullPackingList } from "$/transformers/packing-list";

export const packingListRouter = Router();
packingListRouter.use(requireValidSession);

packingListRouter.get(
  "/",
  validate({ query: packingListSearch }),
  async (req, res) => {
    const matchingPackingLists = await db.packingList.findMany({
      where: {
        name: {
          contains: req.query.query,
          mode: "insensitive",
        },
        OR: [{ public: true }, { userId: req.session!.user.id }],
      },
    });

    return res.json({
      packingLists: matchingPackingLists.map(transformers.packingList),
    });
  },
);

packingListRouter.get("/:id", async (req, res) => {
  const packingList = await db.packingList.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      packingListSections: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!packingList) {
    return res.sendStatus(404);
  }

  return res.json({ packingList: transformers.packingList(packingList) });
});

packingListRouter.post(
  "/",
  validate({ body: newPackingList }),
  async (req, res) => {
    const { name, copiedFromPackingListId } = req.body;
    let newPackingListId: number;

    if (!copiedFromPackingListId) {
      const newPackingList = await db.packingList.create({
        data: {
          userId: req.session!.user.id,
          name,
        },
      });

      newPackingListId = newPackingList.id;
    } else {
      const copiedList = await db.packingList.findUnique({
        where: {
          id: copiedFromPackingListId,
          OR: [{ public: true }, { userId: req.session!.user.id }],
        },
        include: {
          packingListSections: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!copiedList) {
        return res.status(404).json({
          error: `Could not find an existing packing list with the id: ${copiedFromPackingListId}`,
        });
      }

      await db.$transaction(async (tx) => {
        const newPackingList = await db.packingList.create({
          data: {
            userId: req.session!.user.id,
            name,
            copiedFromPackingListId,
          },
        });

        for (const originalSection of copiedList.packingListSections) {
          await db.packingListSection.create({
            data: {
              name: originalSection.name,
              sortPosition: originalSection.sortPosition,
              packingListId: newPackingList.id,
              items: {
                createMany: {
                  data: originalSection.items.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    optional: item.optional,
                    sortPosition: item.sortPosition,
                    gearCategoryId: item.gearCategoryId,
                  })),
                },
              },
            },
          });
        }

        newPackingListId = newPackingList.id;
      });
    }

    const packingList = await db.packingList.findUnique({
      where: { id: newPackingListId! },
      include: {
        packingListSections: {
          include: {
            items: true,
          },
        },
      },
    });

    return res.json({ packingList: transformers.packingList(packingList!) });
  },
);
