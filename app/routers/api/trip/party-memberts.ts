import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import {
  createPartyMember,
  editPartyMember,
  tripPartyMemberParams,
} from "$/validation/trip/party-member";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripPartyMembersRouter = Router({ mergeParams: true });

tripPartyMembersRouter.post(
  "/",
  validate({ params: idParam, body: createPartyMember }),
  async (req, res) => {
    const existing = await db.tripPartyMember.findFirst({
      where: {
        tripId: req.params.id,
        name: req.body.name,
        phone: req.body.phone,
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "A trip member with these details already exists" });
    }

    const partyMember = await db.tripPartyMember.create({
      data: {
        tripId: req.params.id,
        name: req.body.name,
        phone: req.body.phone,
      },
    });

    return res
      .status(201)
      .json({ partyMember: transformers.tripPartyMember(partyMember) });
  },
);

tripPartyMembersRouter.delete(
  "/:memberId",
  validate({ params: tripPartyMemberParams }),
  async (req, res) => {
    const partyMember = await db.tripPartyMember.findUnique({
      where: {
        tripId: req.params.id,
        id: req.params.memberId,
      },
    });

    if (!partyMember) {
      return res.sendStatus(404);
    }

    await db.tripPartyMember.delete({ where: { id: req.params.memberId } });
    return res.sendStatus(200);
  },
);

tripPartyMembersRouter.patch(
  "/:memberId",
  validate({ params: tripPartyMemberParams, body: editPartyMember }),
  async (req, res) => {
    const partyMember = await db.tripPartyMember.findUnique({
      where: {
        tripId: req.params.id,
        id: req.params.memberId,
      },
    });

    if (!partyMember) {
      return res.sendStatus(404);
    }

    if (partyMember.userId && req.body.name) {
      return res.status(400).json({
        error:
          "This party member is assigned to an Outpost user and their name can't be edited here.",
      });
    }

    const updatedPartyMember = await db.tripPartyMember.update({
      where: { id: req.params.memberId },
      data: {
        name: req.body.name,
        phone: req.body.phone,
      },
    });

    return res.json({
      partyMember: transformers.tripPartyMember(updatedPartyMember),
    });
  },
);
