import { getLogger } from "$/jobs/utils/logger-setup";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import {
  createFieldCoverageTracker,
  detectSystemicFieldFailures,
} from "$/jobs/workers/public-meal-catalog/field-coverage";
import {
  processProductImage,
  type R2WriteClient,
} from "$/jobs/workers/public-meal-catalog/image";
import { mergePublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import { db } from "$/utils/db";
import type { Job } from "bullmq";

// Fields checked for systemic (whole-run) failure and for whether a row still
// counts as "incomplete" -- kept here rather than inferred from the schema
// since sourceVendor/sourceProductId/sourceUrl are identity, not scraped data.
// A vendor scraper can override this via `trackedFields` if the vendor's own
// site structurally never publishes one of these (e.g. no water-quantity
// text anywhere) -- otherwise that field would report a "systemic failure"
// on every single run forever, rather than genuinely signaling a broken
// parser.
const TRACKED_FIELDS = [
  "brand",
  "calories",
  "waterMl",
  "dryWeightGrams",
  "imageId",
];
const MIN_RUN_SIZE_FOR_ALERT = 3;

export interface VendorScraper<Product> {
  vendorId: string;
  trackedFields?: string[];
  fetchProducts(fetchImpl?: typeof fetch): Promise<Product[]>;
  shouldSkip(product: Product): boolean;
  parseProduct(product: Product): {
    sourceVendor: string;
    sourceProductId: string;
    sourceUrl: string;
    name: string;
    brand: string | null;
    calories: number | null;
    waterMl: number | null;
    dryWeightGrams: number | null;
    imageUrl: string | null;
  };
}

export interface RunVendorImportDeps {
  fetchImpl?: typeof fetch;
  r2Client?: R2WriteClient | null;
}

// Shared orchestration every vendor's job processor calls -- fetch, skip,
// merge, image, upsert, track coverage, notify. A new vendor is a new
// VendorScraper implementation plus one registry.ts entry, not a copy of
// this loop.
export async function runVendorImport<Product>(
  job: Job,
  scraper: VendorScraper<Product>,
  deps: RunVendorImportDeps = {},
) {
  const logger = getLogger(job);
  const products = await scraper.fetchProducts(deps.fetchImpl);
  const coverage = createFieldCoverageTracker(
    scraper.trackedFields ?? TRACKED_FIELDS,
  );

  let processed = 0;
  let skipped = 0;

  for (const product of products) {
    if (scraper.shouldSkip(product)) {
      skipped++;
      await job.updateProgress({
        processed: processed + skipped,
        total: products.length,
      });
      continue;
    }

    const scraped = scraper.parseProduct(product);
    const ignoreRecord = await db.ignoredPublicMealItem.findUnique({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: scraped.sourceVendor,
          sourceProductId: scraped.sourceProductId,
        },
      },
    });
    if (ignoreRecord) {
      skipped++;
      await job.updateProgress({
        processed: processed + skipped,
        total: products.length,
      });
      continue;
    }

    const existing = await db.publicMealItem.findUnique({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: scraped.sourceVendor,
          sourceProductId: scraped.sourceProductId,
        },
      },
    });

    const merged = mergePublicMealItem(scraped, existing);
    const { imageId } = await processProductImage(
      {
        sourceVendor: scraped.sourceVendor,
        sourceProductId: scraped.sourceProductId,
        imageUrl: scraped.imageUrl,
        existing,
      },
      { fetchImpl: deps.fetchImpl, r2Client: deps.r2Client, logger },
    );

    const row = await db.publicMealItem.upsert({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: scraped.sourceVendor,
          sourceProductId: scraped.sourceProductId,
        },
      },
      create: { ...merged, imageId },
      update: { ...merged, imageId },
    });

    coverage.record(row);
    processed++;
    await job.updateProgress({
      processed: processed + skipped,
      total: products.length,
    });
  }

  const failedFields = detectSystemicFieldFailures(
    coverage.counts(),
    processed,
    MIN_RUN_SIZE_FOR_ALERT,
  );

  if (failedFields.length > 0) {
    const admins = await db.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    });

    await createNotificationQueue.addBulk(
      admins.map(({ id }) => ({
        name: "public-meal-catalog-field-failure",
        data: {
          userId: id,
          title: `${scraper.vendorId} import: missing data`,
          description: `${failedFields.join(", ")} came back empty for all ${processed} items in the latest import. The site's structure may have changed.`,
          icon: "WarningIcon",
          referenceUrl: "/admin/queues",
        },
      })),
    );
  }

  logger.info("Vendor import complete", {
    vendorId: scraper.vendorId,
    processed,
    skipped,
    failedFields,
  });

  return { processed, skipped, failedFields };
}
