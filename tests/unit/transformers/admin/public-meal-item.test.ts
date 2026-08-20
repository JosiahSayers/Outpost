import { transform } from "$/transformers/admin/public-meal-item";
import { describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape, including source fields the summary transformer hides", () => {
    const item = make("PublicMealItem", {
      sourceVendor: "peak_refuel",
      sourceProductId: "pr-1",
      sourceUrl: "https://example.com/products/pr-1",
      sourceImageUrl: "https://example.com/images/pr-1.jpg",
      overrideImageUrl: "https://example.com/images/pr-1-override.jpg",
      readyOverride: true,
    });

    expect(transform({ ...item, image: null })).toEqual({
      id: item.id,
      name: item.name,
      brand: item.brand,
      calories: item.calories,
      waterMl: item.waterMl,
      dryWeightGrams: item.dryWeightGrams,
      sourceVendor: "peak_refuel",
      sourceProductId: "pr-1",
      sourceUrl: "https://example.com/products/pr-1",
      sourceImageUrl: "https://example.com/images/pr-1.jpg",
      overrideImageUrl: "https://example.com/images/pr-1-override.jpg",
      readyOverride: true,
      imageUrl: null,
    });
  });

  it("builds imageUrl from the R2 key when an image is attached", () => {
    const item = make("PublicMealItem");
    const image = make("Image", { r2Key: "public-meal-items/abc123.webp" });

    expect(transform({ ...item, image }).imageUrl).toBe(
      `${process.env.R2_PUBLIC_BASE_URL}/public-meal-items/abc123.webp`,
    );
  });
});
