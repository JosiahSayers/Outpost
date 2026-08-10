import { defineJobGroup } from "$/jobs/define-job-group";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { runVendorImport } from "$/jobs/workers/public-meal-catalog/run-vendor-import";
import { backpackersPantryScraper } from "$/jobs/workers/public-meal-catalog/vendors/backpackers-pantry";
import { goodToGoScraper } from "$/jobs/workers/public-meal-catalog/vendors/good-to-go";
import { mountainHouseScraper } from "$/jobs/workers/public-meal-catalog/vendors/mountain-house";
import { nomadNutritionScraper } from "$/jobs/workers/public-meal-catalog/vendors/nomad-nutrition";
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
      schedule: { id: "import-peak-refuel", pattern: "1 0 * * 0" },
    },
    {
      name: packitGourmetScraper.vendorId,
      processor: (job) => runVendorImport(job, packitGourmetScraper),
      defaultJobOptions,
      schedule: { id: "import-packit-gourmet", pattern: "11 0 * * 1" },
    },
    {
      name: mountainHouseScraper.vendorId,
      processor: (job) => runVendorImport(job, mountainHouseScraper),
      defaultJobOptions,
      schedule: { id: "import-mountain-house", pattern: "21 0 * * 2" },
    },
    {
      name: backpackersPantryScraper.vendorId,
      processor: (job) => runVendorImport(job, backpackersPantryScraper),
      defaultJobOptions,
      schedule: {
        id: "import-backpackers-pantry",
        pattern: "31 0 * * 3",
      },
    },
    {
      name: goodToGoScraper.vendorId,
      processor: (job) => runVendorImport(job, goodToGoScraper),
      defaultJobOptions,
      schedule: { id: "import-good-to-go", pattern: "41 0 * * 4" },
    },
    {
      name: nomadNutritionScraper.vendorId,
      processor: (job) => runVendorImport(job, nomadNutritionScraper),
      defaultJobOptions,
      schedule: { id: "import-nomad-nutrition", pattern: "51 0 * * 5" },
    },
    // future vendors added here as their own entry
  ],
});
