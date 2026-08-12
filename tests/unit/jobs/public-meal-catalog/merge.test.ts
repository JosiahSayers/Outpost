import {
  mergePublicMealItem,
  type ScrapedPublicMealItem,
} from "$/jobs/workers/public-meal-catalog/merge";
import { describe, expect, it } from "bun:test";
import type { PublicMealItem } from "../../../../generated/prisma/client";

function scraped(
  overrides: Partial<ScrapedPublicMealItem> = {},
): ScrapedPublicMealItem {
  return {
    sourceVendor: "peak_refuel",
    sourceProductId: "123",
    sourceUrl: "https://peakrefuel.com/products/example",
    name: "Example Meal",
    brand: "Peak Refuel",
    calories: 700,
    waterMl: 237,
    dryWeightGrams: 140,
    imageUrl: "https://cdn.example.com/example.png",
    ...overrides,
  };
}

function existingRow(overrides: Partial<PublicMealItem> = {}): PublicMealItem {
  return {
    id: "existing-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Old Name",
    brand: "Old Brand",
    calories: 500,
    waterMl: 200,
    dryWeightGrams: 100,
    imageId: "old-image-id",
    sourceImageUrl: "https://cdn.example.com/old.png",
    overrideImageUrl: null,
    sourceVendor: "peak_refuel",
    sourceProductId: "123",
    sourceUrl: "https://peakrefuel.com/products/example-old-url",
    ...overrides,
  };
}

describe("mergePublicMealItem", () => {
  it("uses every scraped field as-is when there is no existing row", () => {
    const result = mergePublicMealItem(scraped(), null);

    expect(result).toEqual({
      name: "Example Meal",
      brand: "Peak Refuel",
      calories: 700,
      waterMl: 237,
      dryWeightGrams: 140,
      sourceImageUrl: "https://cdn.example.com/example.png",
      overrideImageUrl: null,
      sourceUrl: "https://peakrefuel.com/products/example",
      sourceVendor: "peak_refuel",
      sourceProductId: "123",
    });
  });

  it("falls back to the existing value for every nullable field the scrape couldn't parse", () => {
    const result = mergePublicMealItem(
      scraped({
        brand: null,
        calories: null,
        waterMl: null,
        dryWeightGrams: null,
        imageUrl: null,
      }),
      existingRow(),
    );

    expect(result.brand).toBe("Old Brand");
    expect(result.calories).toBe(500);
    expect(result.waterMl).toBe(200);
    expect(result.dryWeightGrams).toBe(100);
    expect(result.sourceImageUrl).toBe("https://cdn.example.com/old.png");
  });

  it("overwrites the existing value when the scrape found a fresh one", () => {
    const result = mergePublicMealItem(
      scraped({ calories: 900, waterMl: 300 }),
      existingRow({ calories: 500, waterMl: 200 }),
    );

    expect(result.calories).toBe(900);
    expect(result.waterMl).toBe(300);
  });

  it("stays null when neither the scrape nor the existing row has a value", () => {
    const result = mergePublicMealItem(
      scraped({ dryWeightGrams: null }),
      existingRow({ dryWeightGrams: null }),
    );

    expect(result.dryWeightGrams).toBeNull();
  });

  it("always takes name and sourceUrl from the fresh scrape, never the existing row", () => {
    const result = mergePublicMealItem(
      scraped({
        name: "New Name",
        sourceUrl: "https://peakrefuel.com/products/new-url",
      }),
      existingRow({
        name: "Old Name",
        sourceUrl: "https://peakrefuel.com/products/example-old-url",
      }),
    );

    expect(result.name).toBe("New Name");
    expect(result.sourceUrl).toBe("https://peakrefuel.com/products/new-url");
  });

  it("keeps an admin's photo override when the fresh scrape's image url matches the known source", () => {
    const result = mergePublicMealItem(
      scraped({ imageUrl: "https://cdn.example.com/old.png" }),
      existingRow({
        sourceImageUrl: "https://cdn.example.com/old.png",
        overrideImageUrl: "https://cdn.example.com/admin-override.png",
      }),
    );

    expect(result.sourceImageUrl).toBe("https://cdn.example.com/old.png");
    expect(result.overrideImageUrl).toBe(
      "https://cdn.example.com/admin-override.png",
    );
  });

  it("keeps an admin's photo override when the scrape didn't find an image at all", () => {
    const result = mergePublicMealItem(
      scraped({ imageUrl: null }),
      existingRow({
        sourceImageUrl: "https://cdn.example.com/old.png",
        overrideImageUrl: "https://cdn.example.com/admin-override.png",
      }),
    );

    expect(result.overrideImageUrl).toBe(
      "https://cdn.example.com/admin-override.png",
    );
  });

  it("clears an admin's photo override once the source image url changes", () => {
    const result = mergePublicMealItem(
      scraped({ imageUrl: "https://cdn.example.com/new.png" }),
      existingRow({
        sourceImageUrl: "https://cdn.example.com/old.png",
        overrideImageUrl: "https://cdn.example.com/admin-override.png",
      }),
    );

    expect(result.sourceImageUrl).toBe("https://cdn.example.com/new.png");
    expect(result.overrideImageUrl).toBeNull();
  });

  it("has no override to carry forward when there is no existing row", () => {
    const result = mergePublicMealItem(scraped(), null);

    expect(result.overrideImageUrl).toBeNull();
  });
});
