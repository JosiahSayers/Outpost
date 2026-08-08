import { S3Client } from "bun";

// A function rather than a top-level singleton (contrast with db.ts's `db`)
// -- constructing at import time would force every file that imports this
// module, including unrelated tests, to have R2 env vars set. Callers treat
// a missing/misconfigured client as just another reason to skip image
// handling for a given item (see public-meal-catalog/image.ts).
export function createR2Client(): S3Client | null {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
  } = process.env;

  if (
    !R2_ACCOUNT_ID ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET
  ) {
    return null;
  }

  return new S3Client({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  });
}

export function publicMealItemImageKey(
  sourceVendor: string,
  sourceProductId: string,
): string {
  return `public-meal-items/${sourceVendor}/${sourceProductId}.webp`;
}
