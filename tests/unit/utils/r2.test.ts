import { storageKeys } from "$/utils/r2";
import { describe, expect, test } from "bun:test";

describe("storageKeys", () => {
  describe("publicMealItem", () => {
    test("trip", () => {
      const testVendor = "test-vendor";
      const testProduct = "test-product";
      expect(storageKeys.publicMealItem.image(testVendor, testProduct)).toBe(
        `public-meal-items/${testVendor}/${testProduct}.webp`,
      );
    });
  });

  describe("user", () => {
    describe("trip", () => {
      test("file", () => {
        const userId = "user-id";
        const tripId = "trip-id";
        const file = "file.pdf";
        const output = storageKeys.user.trip.file(userId, tripId, file);
        expect(output).toBe(`${userId}/trips/${tripId}/files/${file}`);
      });
    });
  });
});
