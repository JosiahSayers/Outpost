import { requireValidSession } from "$/middleware/require-valid-session";
import {
  userCanAccessPackingList,
  userCanEditPackingList,
} from "$/middleware/authorization/packing-list";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import {
  editPackingList,
  newPackingList,
  packingListSearch,
} from "$/validation/packing-list";
import { Router } from "express";
import validate from "express-zod-safe";
import { generatePackingListPdf } from "$/utils/pdf/packing-list-generator";
import { sectionsRouter } from "$/routers/api/packing-list/sections";
import { idParam } from "$/validation/shared";

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

packingListRouter.get("/:id", userCanAccessPackingList, async (req, res) => {
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

  return res.json({ packingList: transformers.packingList(packingList!) });
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
        req.logger.warn("User tried to copy a non-public list they don't own", {
          triedToCopyListId: copiedFromPackingListId,
        });
        return res.status(404).json({
          error: `Could not find an existing packing list with the id: ${copiedFromPackingListId}`,
        });
      }

      await db.$transaction(async (tx) => {
        const newPackingList = await tx.packingList.create({
          data: {
            userId: req.session!.user.id,
            name,
            copiedFromPackingListId,
          },
        });

        for (const originalSection of copiedList.packingListSections) {
          await tx.packingListSection.create({
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

    return res
      .status(201)
      .json({ packingList: transformers.packingList(packingList!) });
  },
);

packingListRouter.delete("/:id", async (req, res) => {
  const packingList = await db.packingList.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!packingList) {
    return res.sendStatus(404);
  }

  if (packingList.userId !== req.session!.user.id) {
    req.logger.warn("User tried to delete a packing list they don't own", {
      triedToDeleteListId: packingList.id,
    });
    return res.sendStatus(403);
  }

  await db.packingList.delete({ where: { id: packingList.id } });
  return res.sendStatus(200);
});

packingListRouter.get(
  "/:id/pdf",
  userCanAccessPackingList,
  async (req, res) => {
    res.attachment("packing-list.pdf");
    return await generatePackingListPdf(Number(req.params.id), res);
  },
);

packingListRouter.patch(
  "/:id",
  userCanEditPackingList,
  validate({ body: editPackingList, params: idParam }),
  async (req, res) => {
    const updatedPackingList = await db.packingList.update({
      data: { name: req.body.name },
      where: { id: Number(req.params.id) },
      include: {
        packingListSections: {
          include: {
            items: true,
          },
        },
      },
    });

    return res.json({
      packingList: transformers.packingList(updatedPackingList),
    });
  },
);

packingListRouter.use("/:id/sections", userCanEditPackingList, sectionsRouter);
