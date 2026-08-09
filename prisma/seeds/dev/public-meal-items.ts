import { db } from "$/utils/db";
import { make } from "../../../tests/helpers/test-data/make";

// A handful of realistic public-catalog rows for local dev -- some complete,
// one deliberately missing fields so the incomplete-imports admin page
// (BTP-110) has something to show without needing to run the real scraper.
// Beef Stroganoff gets an Image pointed at a placeholder host (see
// R2_PUBLIC_BASE_URL in .env.example) rather than a real R2 upload -- no R2
// credentials needed for `db:seed`, but BTP-111's search UI still has an
// image to render for manual verification. The rest are left imageless.
export async function createPublicMealItems() {
  const stroganoffImage = await db.image.upsert({
    where: { r2Key: "400x400/f4a460/402314.png?text=Beef+Stroganoff" },
    create: make("Image", {
      r2Key: "400x400/f4a460/402314.png?text=Beef+Stroganoff",
      contentType: "image/png",
      width: 400,
      height: 400,
    }),
    update: {},
  });

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
        imageId: stroganoffImage.id,
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
