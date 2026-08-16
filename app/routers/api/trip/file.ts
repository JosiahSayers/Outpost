import { userHasFeature } from "$/middleware/authorization/user-has-feature";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import { createR2Client, storageKeys } from "$/utils/r2";
import { Router } from "express";
import multer from "multer";

const TEN_MB = 1e7;

export const tripFileRouter = Router({ mergeParams: true });

const uploadMiddleware = multer({
  limits: {
    fileSize: TEN_MB,
    files: 1,
  },
  storage: multer.memoryStorage(),
}).single("file");

tripFileRouter.post(
  "/",
  userHasFeature("trip-file-upload"),
  uploadMiddleware,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const r2Client = createR2Client("user-uploads");
    if (!r2Client) {
      return res.sendStatus(500);
    }

    const storageKey = storageKeys.user.trip.file(
      req.session!.user.id,
      String(req.params.id),
      req.file.originalname,
    );
    const existingFile = await db.file.findUnique({
      where: { r2Key: storageKey },
    });
    if (existingFile) {
      return res
        .status(409)
        .json({ error: "File with this name already exists on this trip" });
    }

    const newFile = await db.file.create({
      data: {
        tripId: String(req.params.id),
        r2Key: storageKey,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        bytes: req.file.size,
      },
    });

    try {
      await r2Client.write(storageKey, req.file.buffer);
    } catch (e) {
      logger.error("Failed to upload file to r2", e);
      await db.file.delete({ where: { id: newFile.id } });
      return res.sendStatus(500);
    }

    return res.status(201).json({ file: transformers.file(newFile) });
  },
);
