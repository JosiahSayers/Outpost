import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import { runVendorImport } from "$/jobs/workers/public-meal-catalog/run-vendor-import";
import type { VendorScraper } from "$/jobs/workers/public-meal-catalog/run-vendor-import";
import type { ScrapedPublicMealItem } from "$/jobs/workers/public-meal-catalog/merge";
import { db } from "$/utils/db";
import type { Job, JobType } from "bullmq";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { make } from "../../../helpers/test-data/make";

interface FakeProduct {
  skip?: boolean;
  scraped: ScrapedPublicMealItem;
}

function fakeScraper(
  vendorId: string,
  products: FakeProduct[],
  trackedFields?: string[],
): VendorScraper<FakeProduct> {
  return {
    vendorId,
    trackedFields,
    fetchProducts: async () => products,
    shouldSkip: (product) => product.skip ?? false,
    parseProduct: (product) => product.scraped,
  };
}

function scraped(
  overrides: Partial<ScrapedPublicMealItem> = {},
): ScrapedPublicMealItem {
  return {
    sourceVendor: "fake_vendor",
    sourceProductId: "1",
    sourceUrl: "https://example.com/product/1",
    name: "Fake Meal",
    brand: "Fake Brand",
    calories: 700,
    waterMl: 237,
    dryWeightGrams: 140,
    imageUrl: null,
    ...overrides,
  };
}

function makeJob(
  updateProgress: ReturnType<
    typeof mock<(progress: { processed: number; total: number }) => void>
  > = mock((_progress: { processed: number; total: number }) => {}),
): Job {
  return {
    id: "test-job-id",
    name: "fake_vendor",
    data: {},
    updateProgress,
  } as unknown as Job;
}

const NOTIFICATION_JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

async function notificationJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await createNotificationQueue.getJobs(
    NOTIFICATION_JOB_STATES,
  )) as Job<CreateNotificationJobData>[];
}

let adminUserId: string;

beforeEach(async () => {
  const admin = await db.user.findUniqueOrThrow({
    where: { email: "admin@test.com" },
  });
  adminUserId = admin.id;
});

describe("runVendorImport", () => {
  it("creates a PublicMealItem for each non-skipped product and counts skips", async () => {
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", name: "Included Meal" }) },
      {
        skip: true,
        scraped: scraped({ sourceProductId: "2", name: "Skipped" }),
      },
    ]);

    const result = await runVendorImport(makeJob(), scraper);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    const row = await db.publicMealItem.findUnique({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(row?.name).toBe("Included Meal");
  });

  it("reports progress after every product, skipped or not, against the full fetched total", async () => {
    const updateProgress = mock(
      (_progress: { processed: number; total: number }) => {},
    );
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1" }) },
      { skip: true, scraped: scraped({ sourceProductId: "2" }) },
      { scraped: scraped({ sourceProductId: "3" }) },
    ]);

    await runVendorImport(makeJob(updateProgress), scraper);

    expect(updateProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { processed: 1, total: 3 },
      { processed: 2, total: 3 },
      { processed: 3, total: 3 },
    ]);
  });

  it("preserves a previously-stored value when a re-scrape comes back null", async () => {
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        calories: 555,
      }),
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", calories: null }) },
    ]);

    await runVendorImport(makeJob(), scraper);

    const row = await db.publicMealItem.findUniqueOrThrow({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(row.calories).toBe(555);
  });

  it("overwrites a previously-stored value when the re-scrape found a fresh one", async () => {
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        calories: 555,
      }),
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", calories: 999 }) },
    ]);

    await runVendorImport(makeJob(), scraper);

    const row = await db.publicMealItem.findUniqueOrThrow({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(row.calories).toBe(999);
  });

  it("notifies every admin-role user when a field is null for every item in a run above the minimum size", async () => {
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", calories: null }) },
      { scraped: scraped({ sourceProductId: "2", calories: null }) },
      { scraped: scraped({ sourceProductId: "3", calories: null }) },
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      runVendorImport(makeJob(), scraper),
    );

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.data.userId === adminUserId)).toBe(true);
    expect(jobs[0]!.data.icon).toBe("WarningIcon");
    expect(jobs[0]!.data.title).toContain("fake_vendor");
    expect(jobs[0]!.data.description).toContain("calories");
    expect(jobs[0]!.data.notificationSettingName).toBeNull();
  });

  it("does not notify when the run is below the minimum size, even at 100% null", async () => {
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", calories: null }) },
      { scraped: scraped({ sourceProductId: "2", calories: null }) },
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      runVendorImport(makeJob(), scraper),
    );

    expect(jobs).toHaveLength(0);
  });

  it("does not notify when only some items in the run are missing a field", async () => {
    // None of these fake products carry an image, so without this, imageId
    // would also be null for all 3 items -- a real systemic failure in its
    // own right that would trigger a notification and defeat the point of
    // this test. Pre-seeding one row with an image already attached keeps
    // imageId at 2/3 null, isolating the assertion to calories.
    const existingImage = await db.image.create({ data: make("Image", {}) });
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "2",
        imageId: existingImage.id,
      }),
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", calories: null }) },
      { scraped: scraped({ sourceProductId: "2", calories: 800 }) },
      { scraped: scraped({ sourceProductId: "3", calories: 900 }) },
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      runVendorImport(makeJob(), scraper),
    );

    expect(jobs).toHaveLength(0);
  });

  it("skips a product that has been marked as ignored and does not create a PublicMealItem", async () => {
    await db.ignoredPublicMealItem.create({
      data: {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        ignoredById: adminUserId,
      },
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1", name: "Ignored Meal" }) },
      { scraped: scraped({ sourceProductId: "2", name: "Included Meal" }) },
    ]);

    const result = await runVendorImport(makeJob(), scraper);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    const ignoredRow = await db.publicMealItem.findUnique({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(ignoredRow).toBeNull();
  });

  it("does not re-create a PublicMealItem that was previously deleted and marked ignored", async () => {
    await db.ignoredPublicMealItem.create({
      data: {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        ignoredById: adminUserId,
      },
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1" }) },
    ]);

    await runVendorImport(makeJob(), scraper);

    const count = await db.publicMealItem.count({
      where: { sourceVendor: "fake_vendor", sourceProductId: "1" },
    });
    expect(count).toBe(0);
  });

  it("reports progress for an ignored product the same as any other skip", async () => {
    await db.ignoredPublicMealItem.create({
      data: {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        ignoredById: adminUserId,
      },
    });
    const updateProgress = mock(
      (_progress: { processed: number; total: number }) => {},
    );
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "1" }) },
      { scraped: scraped({ sourceProductId: "2" }) },
    ]);

    await runVendorImport(makeJob(updateProgress), scraper);

    expect(updateProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { processed: 1, total: 2 },
      { processed: 2, total: 2 },
    ]);
  });

  it("only ignores the exact sourceVendor/sourceProductId pair, not other products", async () => {
    await db.ignoredPublicMealItem.create({
      data: {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        ignoredById: adminUserId,
      },
    });
    const scraper = fakeScraper("fake_vendor", [
      { scraped: scraped({ sourceProductId: "2", name: "Different Product" }) },
    ]);

    const result = await runVendorImport(makeJob(), scraper);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it("keeps an admin's photo override in place when the re-scrape's image url matches the known source", async () => {
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        sourceImageUrl: "https://cdn.example.com/vendor-photo.png",
        overrideImageUrl: "https://cdn.example.com/admin-override.png",
      }),
    });
    const scraper = fakeScraper("fake_vendor", [
      {
        scraped: scraped({
          sourceProductId: "1",
          imageUrl: "https://cdn.example.com/vendor-photo.png",
        }),
      },
    ]);

    await runVendorImport(makeJob(), scraper, { r2Client: null });

    const row = await db.publicMealItem.findUniqueOrThrow({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(row.overrideImageUrl).toBe(
      "https://cdn.example.com/admin-override.png",
    );
  });

  it("clears an admin's photo override once the vendor's source image url changes", async () => {
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "1",
        sourceImageUrl: "https://cdn.example.com/vendor-photo-old.png",
        overrideImageUrl: "https://cdn.example.com/admin-override.png",
      }),
    });
    const scraper = fakeScraper("fake_vendor", [
      {
        scraped: scraped({
          sourceProductId: "1",
          imageUrl: "https://cdn.example.com/vendor-photo-new.png",
        }),
      },
    ]);

    await runVendorImport(makeJob(), scraper, { r2Client: null });

    const row = await db.publicMealItem.findUniqueOrThrow({
      where: {
        sourceVendor_sourceProductId: {
          sourceVendor: "fake_vendor",
          sourceProductId: "1",
        },
      },
    });
    expect(row.overrideImageUrl).toBeNull();
    expect(row.sourceImageUrl).toBe(
      "https://cdn.example.com/vendor-photo-new.png",
    );
  });

  it("does not notify for a field a vendor scraper excludes via trackedFields, even at 100% null", async () => {
    // Mirrors Mountain House excluding waterMl -- a field it structurally
    // never publishes, so alerting on it every run would be a permanent
    // false positive rather than a signal the site changed.
    //
    // None of these fake products carry an image, so imageId would also be
    // null for all 3 -- a real systemic failure in its own right, same as
    // the "only some items" test above. Pre-seeding one row with an image
    // already attached isolates the assertion to waterMl.
    const existingImage = await db.image.create({ data: make("Image", {}) });
    await db.publicMealItem.create({
      data: make("PublicMealItem", {
        sourceVendor: "fake_vendor",
        sourceProductId: "2",
        imageId: existingImage.id,
      }),
    });
    const scraper = fakeScraper(
      "fake_vendor",
      [
        { scraped: scraped({ sourceProductId: "1", waterMl: null }) },
        { scraped: scraped({ sourceProductId: "2", waterMl: null }) },
        { scraped: scraped({ sourceProductId: "3", waterMl: null }) },
      ],
      ["brand", "calories", "dryWeightGrams", "imageId"],
    );

    const jobs = await notificationJobsAddedDuring(() =>
      runVendorImport(makeJob(), scraper),
    );

    expect(jobs).toHaveLength(0);
  });
});
