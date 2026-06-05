import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { packingListSearch } from "$/validation/packing-list";
import { Router } from "express";
import validate from "express-zod-safe";

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
