import { userHasFeature } from "$/middleware/authorization/user-has-feature";
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
    await r2Client.write(storageKey, req.file.buffer);

    return res.sendStatus(201);
  },
);
