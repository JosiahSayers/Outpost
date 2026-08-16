import { userHasFeature } from "$/middleware/authorization/user-has-feature";
import { fileUploadRateLimiter } from "$/middleware/rate-limit";
import { transformers } from "$/transformers";
import { buildContentDisposition } from "$/utils/content-disposition";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import { createR2Client, storageKeys } from "$/utils/r2";
import { tripFileParams } from "$/validation/trip/file";
import type { ErrorRequestHandler } from "express";
import { Router } from "express";
import validate from "express-zod-safe";
import multer from "multer";

const TEN_MB = 1e7;

export type TripFileR2Client = ReturnType<typeof createR2Client>;

// `req.app.locals.r2Client`, when set, overrides the real R2 client -- tests
// use this to inject a fake client on the shared app instance rather than
// hitting real R2 (createR2Client needs env vars CI doesn't set, and local
// dev credentials point at a real bucket). Undefined (the production
// default) falls through to the real client; an explicit `null` is
// respected so tests can also force the "R2 unavailable" path.
function getR2Client(req: {
  app: { locals: { r2Client?: TripFileR2Client } };
}): TripFileR2Client {
  const injected = req.app.locals.r2Client;
  return injected !== undefined ? injected : createR2Client("user-uploads");
}

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

    const r2Client = getR2Client(req);
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

    const r2Client = getR2Client(req);
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

tripFileRouter.delete(
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

    const r2Client = getR2Client(req);
    if (!r2Client) {
      return res.sendStatus(500);
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.file.delete({ where: { id: file.id } });
        await r2Client.delete(file.r2Key);
      });
    } catch (e) {
      logger.error("failed to delete trip file", { err: e, file });
      return res.sendStatus(500);
    }

    return res.sendStatus(200);
  },
);

tripFileRouter.use(((err, req, res, next) => {
  if (!(err instanceof multer.MulterError)) {
    return next(err);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File exceeds the 10MB size limit" });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      error: "Only one file, in the 'file' field, may be uploaded at a time",
    });
  }

  return res.status(400).json({ error: "Invalid file upload" });
}) satisfies ErrorRequestHandler);
