import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";

// A handful of realistic public-catalog rows for local dev -- some complete,
// one deliberately missing fields so the incomplete-imports admin page
// (BTP-110) has something to show without needing to run the real scraper.
// No imageId on any of these; R2 credentials aren't required for `db:seed`.
export async function createPublicMealItems() {
  await db.publicMealItem.createMany({
    data: [
      make("PublicMealItem", {
        name: "White Chicken Chili",
        brand: "Peak Refuel",
        calories: 760,
        waterMl: 237,
        dryWeightGrams: 140,
        sourceVendor: "peak_refuel",
        sourceProductId: "9000000000001",
        sourceUrl: "https://peakrefuel.com/products/white-chicken-chili",
      }),
      make("PublicMealItem", {
        name: "Beef Stroganoff",
        brand: "Peak Refuel",
        calories: 640,
        waterMl: 296,
        dryWeightGrams: 156,
        sourceVendor: "peak_refuel",
        sourceProductId: "9000000000002",
        sourceUrl: "https://peakrefuel.com/products/beef-stroganoff",
      }),
      // Incomplete on purpose -- exercises BTP-110's flagging query.
      make("PublicMealItem", {
        name: "Sweet Pork & Rice",
        brand: "Peak Refuel",
        calories: null,
        waterMl: null,
        dryWeightGrams: null,
        sourceVendor: "peak_refuel",
        sourceProductId: "9000000000003",
        sourceUrl: "https://peakrefuel.com/products/sweet-pork-and-rice",
      }),
    ],
    skipDuplicates: true,
  });
}
