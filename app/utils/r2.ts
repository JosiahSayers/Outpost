import { S3Client } from "bun";

// A function rather than a top-level singleton (contrast with db.ts's `db`)
// -- constructing at import time would force every file that imports this
// module, including unrelated tests, to have R2 env vars set. Callers treat
// a missing/misconfigured client as just another reason to skip image
// handling for a given item (see public-meal-catalog/image.ts).
export function createR2Client(
  bucket: "images" | "user-uploads",
): S3Client | null {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET__IMAGES,
    R2_BUCKET__USER_UPLOADS,
  } = process.env;

  const CHOSEN_BUCKET =
    bucket === "images"
      ? R2_BUCKET__IMAGES
      : bucket === "user-uploads"
        ? R2_BUCKET__USER_UPLOADS
        : null;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !CHOSEN_BUCKET
  ) {
    return null;
  }

  return new S3Client({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: CHOSEN_BUCKET,
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  });
}

export const storageKeys = {
  publicMealItem: {
    image: (sourceVendor: string, sourceProductId: string) =>
      `public-meal-items/${sourceVendor}/${sourceProductId}.webp`,
  },
  user: {
    trip: {
      file: (userId: string, tripId: string, file: string) =>
        `${userId}/trips/${tripId}/files/${file}`,
    },
  },
} as const;
