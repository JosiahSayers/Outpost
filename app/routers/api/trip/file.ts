import { userHasFeature } from "$/middleware/authorization/user-has-feature";
import { fileUploadRateLimiter } from "$/middleware/rate-limit";
import { transformers } from "$/transformers";
import { buildContentDisposition } from "$/utils/content-disposition";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import { createR2Client, storageKeys } from "$/utils/r2";
import { tripFileParams } from "$/validation/trip/file";
import { Router } from "express";
import validate from "express-zod-safe";
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
  fileUploadRateLimiter,
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

    const existingFile = await db.file.findUnique({
      where: {
        tripId_filename: {
          tripId: String(req.params.id),
          filename: req.file.originalname,
        },
      },
    });
    if (existingFile) {
      return res
        .status(409)
        .json({ error: "File with this name already exists on this trip" });
    }

    const storageKey = storageKeys.user.trip.file(
      req.session!.user.id,
      String(req.params.id),
      crypto.randomUUID(),
    );
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
      await r2Client.write(storageKey, req.file.buffer, {
        type: req.file.mimetype,
      });
    } catch (e) {
      logger.error("Failed to upload file to r2", e);
      await db.file.delete({ where: { id: newFile.id } });
      return res.sendStatus(500);
    }

    return res.status(201).json({ file: transformers.file(newFile) });
  },
);

tripFileRouter.get(
  "/:fileId",
  validate({ params: tripFileParams }),
  async (req, res) => {
    const file = await db.file.findUnique({
      where: {
        id: req.params.fileId,
        tripId: req.params.id,
      },
    });

    if (!file) {
      return res.sendStatus(404);
    }

    const r2Client = createR2Client("user-uploads");
    if (!r2Client) {
      return res.sendStatus(500);
    }

    const downloadUrl = r2Client.presign(file.r2Key, {
      method: "GET",
      expiresIn: 3600,
      contentDisposition: buildContentDisposition(file.filename, "attachment"),
      type: file.contentType,
    });

    return res.redirect(downloadUrl);
  },
);
