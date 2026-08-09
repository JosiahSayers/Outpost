import { defineJobGroup } from "$/jobs/define-job-group";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { runVendorImport } from "$/jobs/workers/public-meal-catalog/run-vendor-import";
import { mountainHouseScraper } from "$/jobs/workers/public-meal-catalog/vendors/mountain-house";
import { packitGourmetScraper } from "$/jobs/workers/public-meal-catalog/vendors/packit-gourmet";
import { peakRefuelScraper } from "$/jobs/workers/public-meal-catalog/vendors/peak-refuel";

export const PUBLIC_MEAL_CATALOG_QUEUE = "public_meal_catalog__import";

// One shared queue for every vendor import job (see define-job-group.ts) --
// each website we ingest from gets its own job here rather than its own
// queue.
export const publicMealCatalogImportGroup = defineJobGroup({
  name: PUBLIC_MEAL_CATALOG_QUEUE,
  jobs: [
    {
      name: peakRefuelScraper.vendorId,
      processor: (job) => runVendorImport(job, peakRefuelScraper),
      defaultJobOptions,
      schedule: { id: "import-peak-refuel-nightly", pattern: "1 0 * * *" },
    },
    {
      name: packitGourmetScraper.vendorId,
      processor: (job) => runVendorImport(job, packitGourmetScraper),
      defaultJobOptions,
      schedule: { id: "import-packit-gourmet-nightly", pattern: "11 0 * * *" },
    },
    {
      name: mountainHouseScraper.vendorId,
      processor: (job) => runVendorImport(job, mountainHouseScraper),
      defaultJobOptions,
      schedule: { id: "import-mountain-house-nightly", pattern: "21 0 * * *" },
    },
    // future vendors added here as their own entry
  ],
});
