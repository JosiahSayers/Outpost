import { FluidUnit } from "$/frontend/shared-components/converter/fluid-conversions";
import type { FullTrip } from "$/transformers/trip";
import {
  generateTripSummaryPdf,
  resolveFluidUnit,
  toFoodDays,
  toMealPlanDays,
  type TripSummaryPdfOptions,
} from "$/utils/pdf/trip-summary/generate-trip-summary-pdf";
import { describe, expect, it } from "bun:test";
import { Writable } from "node:stream";

describe("resolveFluidUnit", () => {
  it("passes through a valid stored unit", () => {
    expect(resolveFluidUnit("fluidOunce")).toBe(FluidUnit.fluidOunce);
  });

  it("falls back to the app default when nothing is stored", () => {
    expect(resolveFluidUnit(undefined)).toBe(FluidUnit.ml);
    expect(resolveFluidUnit(null)).toBe(FluidUnit.ml);
  });

  it("falls back to the app default for a stale/invalid stored value", () => {
    expect(resolveFluidUnit("gallons")).toBe(FluidUnit.ml);
  });
});

function tripWithMealPlanDays(mealPlanDays: unknown): FullTrip {
  return { mealPlanDays } as unknown as FullTrip;
}

describe("toMealPlanDays", () => {
  it("sorts days by dayNumber and maps mealPlanItem fields onto the item", () => {
    const trip = tripWithMealPlanDays([
      {
        dayNumber: 2,
        date: new Date("2026-08-15T00:00:00.000Z"),
        items: [
          {
            meal: "lunch",
            quantity: 2,
            mealPlanItem: { name: "Tortillas", waterMl: 100 },
          },
        ],
      },
      {
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
        items: [],
      },
    ]);

    const days = toMealPlanDays(trip);

    expect(days.map((d) => d.dayNumber)).toEqual([1, 2]);
    expect(days[1]!.items).toEqual([
      { meal: "lunch", name: "Tortillas", quantity: 2, waterMl: 100 },
    ]);
  });

  it("passes through a null waterMl instead of coercing it", () => {
    const trip = tripWithMealPlanDays([
      {
        dayNumber: 1,
        date: null,
        items: [
          {
            meal: "breakfast",
            quantity: 1,
            mealPlanItem: { name: "Oatmeal", waterMl: null },
          },
        ],
      },
    ]);

    expect(toMealPlanDays(trip)[0]!.items[0]!.waterMl).toBeNull();
  });
});

describe("toFoodDays", () => {
  it("carries purchased/packed status through alongside name/quantity", () => {
    const trip = tripWithMealPlanDays([
      {
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
        items: [
          {
            meal: "dinner",
            quantity: 1,
            purchased: true,
            packed: false,
            mealPlanItem: { name: "Chili mac" },
          },
        ],
      },
    ]);

    expect(toFoodDays(trip)[0]!.items).toEqual([
      {
        meal: "dinner",
        name: "Chili mac",
        quantity: 1,
        purchased: true,
        packed: false,
      },
    ]);
  });

  it("sorts by dayNumber, same as toMealPlanDays", () => {
    const trip = tripWithMealPlanDays([
      { dayNumber: 2, date: null, items: [] },
      { dayNumber: 1, date: null, items: [] },
    ]);

    expect(toFoodDays(trip).map((d) => d.dayNumber)).toEqual([1, 2]);
  });
});

function makeFullTripFixture(overrides: Partial<FullTrip> = {}): FullTrip {
  return {
    id: "trip-1",
    name: "Wonderland Trail Loop",
    trail: "Wonderland Trail",
    location: "Mount Rainier National Park, WA",
    status: "planning",
    start: new Date("2026-08-14T00:00:00.000Z"),
    end: new Date("2026-08-20T00:00:00.000Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "user-1",
    tasks: [
      {
        id: "task-1",
        name: "Reserve permits",
        complete: true,
        phase: "before",
        dueDate: null,
        tripId: "trip-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    mealPlanDays: [
      {
        id: "day-1",
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
        tripId: "trip-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "item-1",
            meal: "breakfast",
            quantity: 1,
            purchased: true,
            packed: false,
            mealPlanDayId: "day-1",
            mealPlanItemId: "meal-item-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            mealPlanItem: {
              id: "meal-item-1",
              name: "Oatmeal",
              brand: null,
              calories: 400,
              waterMl: 350,
              dryWeightGrams: null,
              userId: "user-1",
              publicMealSourceId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      },
    ],
    links: [],
    packingList: null,
    ...overrides,
  } as unknown as FullTrip;
}

function assignedGearPackingList(): FullTrip["packingList"] {
  return {
    id: "tpl-1",
    tripId: "trip-1",
    packingListId: "pl-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    packingList: {
      id: "pl-1",
      name: "Gear",
      description: null,
      sourceUrl: null,
      userId: "user-1",
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      packingListSections: [
        {
          id: "section-1",
          name: "Shelter",
          packingListId: "pl-1",
          sortPosition: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [
            {
              id: "item-1",
              name: "Tent",
              quantity: 1,
              optional: false,
              sortPosition: 1,
              gearCategoryId: null,
              assignedGearId: null,
              packingListSectionId: "section-1",
              trackGearAssignment: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              assignedGear: null,
              category: null,
              tripPackingListItemStatuses: [
                { id: "status-1", packed: true, notNeeded: false },
              ],
            },
          ],
        },
      ],
    },
  } as unknown as FullTrip["packingList"];
}

async function renderTripSummaryToBuffer(
  trip: FullTrip,
  options: TripSummaryPdfOptions,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  const finished = new Promise<void>((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });

  await generateTripSummaryPdf(trip, options, output);
  await finished;

  return Buffer.concat(chunks);
}

function isValidPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("generateTripSummaryPdf", () => {
  it("renders a valid PDF containing just the masthead when no sections are selected", async () => {
    const pdf = await renderTripSummaryToBuffer(makeFullTripFixture(), {
      sections: new Set(),
      taskBlank: false,
      packingListBlank: false,
      fluidUnit: FluidUnit.ml,
    });

    expect(isValidPdf(pdf)).toBe(true);
  });

  it("renders without throwing when every section is selected", async () => {
    const trip = makeFullTripFixture({
      packingList: assignedGearPackingList(),
    });

    const pdf = await renderTripSummaryToBuffer(trip, {
      sections: new Set(["details", "tasks", "mealPlan", "packingList"]),
      taskBlank: false,
      packingListBlank: false,
      fluidUnit: FluidUnit.ml,
    });

    expect(isValidPdf(pdf)).toBe(true);
  });

  it("still renders the Food side of the packing list when no gear list is assigned", async () => {
    const trip = makeFullTripFixture({ packingList: null });

    const pdf = await renderTripSummaryToBuffer(trip, {
      sections: new Set(["packingList"]),
      taskBlank: false,
      packingListBlank: false,
      fluidUnit: FluidUnit.ml,
    });

    expect(isValidPdf(pdf)).toBe(true);
  });

  it("respects blank options without throwing", async () => {
    const trip = makeFullTripFixture({
      packingList: assignedGearPackingList(),
    });

    const pdf = await renderTripSummaryToBuffer(trip, {
      sections: new Set(["tasks", "packingList"]),
      taskBlank: true,
      packingListBlank: true,
      fluidUnit: FluidUnit.ml,
    });

    expect(isValidPdf(pdf)).toBe(true);
  });

  it("produces a longer document as more sections are added", async () => {
    const trip = makeFullTripFixture();

    const detailsOnly = await renderTripSummaryToBuffer(trip, {
      sections: new Set(["details"]),
      taskBlank: false,
      packingListBlank: false,
      fluidUnit: FluidUnit.ml,
    });
    const detailsAndTasksAndMeals = await renderTripSummaryToBuffer(trip, {
      sections: new Set(["details", "tasks", "mealPlan"]),
      taskBlank: false,
      packingListBlank: false,
      fluidUnit: FluidUnit.ml,
    });

    expect(detailsAndTasksAndMeals.length).toBeGreaterThan(detailsOnly.length);
  });
});
