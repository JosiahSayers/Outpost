import { fetchGuarded, type GuardedFetchOptions } from "$/utils/guarded-fetch";
import { createR2Client, publicMealItemImageKey } from "$/utils/r2";
import { db } from "$/utils/db";
import type { Logger } from "winston";
import type { PublicMealItem } from "../../../../generated/prisma/browser";

const IMAGE_CONTENT_TYPES = /\bimage\/(jpeg|jpg|png|webp|gif|avif)\b/i;
const MAX_IMAGE_BYTES = 8_000_000;
const IMAGE_TIMEOUT_MS = 10_000;
const WEBP_QUALITY = 80;
// Decompression-bomb guard for Bun.Image. 4096x4096 was hitting real vendor
// product photos (ERR_IMAGE_TOO_MANY_PIXELS) -- bumped to comfortably cover
// legitimate high-res CDN images while still bounding memory for a genuinely
// malicious tiny-file/huge-dimensions payload.
const MAX_PIXELS = 8192 * 8192;

export interface R2WriteClient {
  write(
    key: string,
    data: Uint8Array,
    options?: { type?: string },
  ): Promise<unknown>;
}

export interface ProcessProductImageInput {
  sourceVendor: string;
  sourceProductId: string;
  imageUrl: string | null;
  existing: PublicMealItem | null;
}

export interface ProcessProductImageDeps {
  fetchImpl?: typeof fetch;
  lookupImpl?: GuardedFetchOptions["lookupImpl"];
  r2Client?: R2WriteClient | null;
  logger: Logger;
}

// Fetches, re-encodes, and stores a product's main image, or reuses what's
// already stored -- the only network+R2-touching piece besides the vendor
// fetch. Any failure anywhere in here (fetch, decode, upload) is caught and
// falls back to the existing imageId, consistent with every other field's
// merge rule (merge.ts) -- a transient CDN hiccup or a missing R2 client on a
// re-scrape shouldn't blank out a previously-good image.
export async function processProductImage(
  input: ProcessProductImageInput,
  deps: ProcessProductImageDeps,
): Promise<{ imageId: string | null }> {
  const { sourceVendor, sourceProductId, imageUrl, existing } = input;
  const { fetchImpl, lookupImpl, logger } = deps;
  const existingImageId = existing?.imageId ?? null;

  if (!imageUrl) {
    return { imageId: existingImageId };
  }

  // Unchanged since the last successful scrape -- skip the fetch/upload
  // entirely rather than re-downloading and re-uploading an identical image
  // on every run.
  if (imageUrl === existing?.sourceImageUrl && existingImageId) {
    return { imageId: existingImageId };
  }

  // "not provided" falls back to the real client; an explicit `null` (used
  // in tests, and whenever a caller has already determined R2 isn't
  // configured) must be respected rather than treated as "unset" by `??`.
  const r2Client =
    deps.r2Client === undefined ? createR2Client() : deps.r2Client;
  if (!r2Client) {
    logger.info(
      "Skipping image processing: R2 is not configured (missing env vars)",
      { sourceVendor, sourceProductId },
    );
    return { imageId: existingImageId };
  }

  try {
    // contentType from the response is discarded -- the re-encoded output is
    // always webp regardless of what format the source image was in.
    const { bytes } = await fetchGuarded(imageUrl, {
      fetchImpl,
      lookupImpl,
      allowedContentTypes: IMAGE_CONTENT_TYPES,
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: IMAGE_TIMEOUT_MS,
    });

    const image = new Bun.Image(bytes, { maxPixels: MAX_PIXELS });
    const { width, height } = await image.metadata();
    const webpBytes = await image.webp({ quality: WEBP_QUALITY }).bytes();

    const r2Key = publicMealItemImageKey(sourceVendor, sourceProductId);
    await r2Client.write(r2Key, webpBytes, { type: "image/webp" });

    if (existingImageId) {
      // Same r2Key gets overwritten above -- update metadata in place rather
      // than creating a second Image row and orphaning the first.
      await db.image.update({
        where: { id: existingImageId },
        data: { r2Key, contentType: "image/webp", width, height },
      });
      return { imageId: existingImageId };
    }

    const created = await db.image.create({
      data: { r2Key, contentType: "image/webp", width, height },
    });
    return { imageId: created.id };
  } catch (err) {
    logger.warn("Failed to process product image, keeping existing value", {
      sourceVendor,
      sourceProductId,
      imageUrl,
      error: err,
    });
    return { imageId: existingImageId };
  }
}
