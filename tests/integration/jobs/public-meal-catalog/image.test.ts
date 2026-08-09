import { processProductImage } from "$/jobs/workers/public-meal-catalog/image";
import { publicMealItemImageKey } from "$/utils/r2";
import { db } from "$/utils/db";
import { getLogger } from "$/jobs/utils/logger-setup";
import type { Job } from "bullmq";
import { describe, expect, it, mock } from "bun:test";
import type { lookup as dnsLookup } from "node:dns/promises";
import { make } from "../../../helpers/test-data/make";

// Every host resolves to a public unicast address so guarded-fetch's SSRF
// check lets these fake CDN URLs through -- mirrors open-graph.test.ts.
const publicLookup = mock(async () => [
  { address: "93.184.215.14", family: 4 },
]) as unknown as typeof dnsLookup;

// A minimal valid 1x1 transparent PNG, decodable by Bun.Image.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function tinyPngBytes(): Uint8Array {
  return new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64"));
}

function pngResponse() {
  return new Response(Buffer.from(tinyPngBytes()), {
    headers: { "content-type": "image/png" },
  });
}

function fakeLogger() {
  return getLogger({
    id: "test-job",
    name: "test",
    data: {},
  } as unknown as Job);
}

function fakeR2Client() {
  return {
    write: mock(
      async (
        _key: string,
        _data: Uint8Array,
        _options?: { type?: string },
      ) => {},
    ),
  };
}

describe("processProductImage", () => {
  it("returns null when there is no image url and no existing image", async () => {
    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "1",
        imageUrl: null,
        existing: null,
      },
      { logger: fakeLogger() },
    );

    expect(result.imageId).toBeNull();
  });

  it("downloads, re-encodes to webp, and uploads a new image", async () => {
    const fetchImpl = mock(async () => pngResponse());
    const r2Client = fakeR2Client();

    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "123",
        imageUrl: "https://cdn.example.com/photo.png",
        existing: null,
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookupImpl: publicLookup,
        r2Client,
        logger: fakeLogger(),
      },
    );

    expect(result.imageId).not.toBeNull();
    const image = await db.image.findUniqueOrThrow({
      where: { id: result.imageId! },
    });
    expect(image.r2Key).toBe(publicMealItemImageKey("peak_refuel", "123"));
    expect(image.contentType).toBe("image/webp");
    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(r2Client.write).toHaveBeenCalledTimes(1);
    const [key, , options] = r2Client.write.mock.calls[0]!;
    expect(key).toBe(publicMealItemImageKey("peak_refuel", "123"));
    expect(options).toEqual({ type: "image/webp" });
  });

  it("skips the fetch entirely when the image url is unchanged and one is already stored", async () => {
    const existingImage = await db.image.create({
      data: make("Image", { r2Key: "public-meal-items/peak_refuel/123.webp" }),
    });
    const existing = make("PublicMealItem", {
      imageId: existingImage.id,
      sourceImageUrl: "https://cdn.example.com/photo.png",
    });
    const fetchImpl = mock(async () => pngResponse());

    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "123",
        imageUrl: "https://cdn.example.com/photo.png",
        existing,
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookupImpl: publicLookup,
        r2Client: fakeR2Client(),
        logger: fakeLogger(),
      },
    );

    expect(result.imageId).toBe(existingImage.id);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("updates the existing Image row in place rather than creating a new one when the url changed", async () => {
    const totalImagesBefore = await db.image.count();
    const existingImage = await db.image.create({
      data: make("Image", {
        r2Key: "public-meal-items/peak_refuel/123.webp",
        width: 999,
        height: 999,
      }),
    });
    const existing = make("PublicMealItem", {
      imageId: existingImage.id,
      sourceImageUrl: "https://cdn.example.com/old.png",
    });
    const fetchImpl = mock(async () => pngResponse());

    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "123",
        imageUrl: "https://cdn.example.com/new.png",
        existing,
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookupImpl: publicLookup,
        r2Client: fakeR2Client(),
        logger: fakeLogger(),
      },
    );

    expect(result.imageId).toBe(existingImage.id);
    const totalImages = await db.image.count();
    expect(totalImages).toBe(totalImagesBefore + 1); // no orphaned second row
    const updated = await db.image.findUniqueOrThrow({
      where: { id: existingImage.id },
    });
    expect(updated.width).toBe(1); // re-fetched and re-processed, not left at the stale 999
  });

  it("falls back to the existing imageId when the fetch fails", async () => {
    const totalImagesBefore = await db.image.count();
    const existingImage = await db.image.create({
      data: make("Image", {}),
    });
    const existing = make("PublicMealItem", {
      imageId: existingImage.id,
      sourceImageUrl: "https://cdn.example.com/old.png",
    });
    const fetchImpl = mock(async () => {
      throw new Error("network error");
    });

    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "123",
        imageUrl: "https://cdn.example.com/new.png",
        existing,
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookupImpl: publicLookup,
        r2Client: fakeR2Client(),
        logger: fakeLogger(),
      },
    );

    expect(result.imageId).toBe(existingImage.id);
    const totalImages = await db.image.count();
    expect(totalImages).toBe(totalImagesBefore + 1); // nothing new created, nothing corrupted
  });

  it("skips processing and falls back to the existing value when R2 is not configured", async () => {
    const existingImage = await db.image.create({ data: make("Image", {}) });
    const existing = make("PublicMealItem", {
      imageId: existingImage.id,
      sourceImageUrl: "https://cdn.example.com/old.png",
    });
    const fetchImpl = mock(async () => pngResponse());

    const result = await processProductImage(
      {
        sourceVendor: "peak_refuel",
        sourceProductId: "123",
        imageUrl: "https://cdn.example.com/new.png",
        existing,
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        r2Client: null,
        logger: fakeLogger(),
      },
    );

    expect(result.imageId).toBe(existingImage.id);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
