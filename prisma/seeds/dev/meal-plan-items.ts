import { db } from "$/utils/db";
import type { MealName, MealPlanDay } from "$/../generated/prisma/client";

interface MenuItem {
  name: string;
  calories: number;
  quantity?: number;
  dryWeightGrams?: number;
  waterMl?: number;
}

// A small rotation of plausible backpacking-food days, cycled by dayNumber so
// every seeded trip gets varied but realistic meals regardless of length.
// The last menu is a lighter hike-out day with no dinner or snacks, which
// also exercises the "nothing planned" empty-meal UI in dev.
//
// waterMl values are chosen as quarter-cup increments in disguise (177 =
// 0.75 cup, 237 = 1 cup, 355 = 1.5 cups, 414 = 1.75 cups, 473 = 2 cups) so
// they display as clean numbers ("1.5 cups") rather than odd ones ("1.48
// cups") for the US-default cup display in useFluidDisplay.
const MENUS: Record<MealName, MenuItem[]>[] = [
  {
    breakfast: [
      {
        name: "Instant Oatmeal",
        calories: 180,
        quantity: 2,
        dryWeightGrams: 90,
        waterMl: 177,
      },
      { name: "Instant Coffee", calories: 5, dryWeightGrams: 10, waterMl: 237 },
    ],
    lunch: [
      { name: "Tortillas", calories: 110, quantity: 4, dryWeightGrams: 30 },
      {
        name: "Peanut Butter Packet",
        calories: 190,
        quantity: 2,
        dryWeightGrams: 32,
      },
      { name: "Summer Sausage", calories: 420, dryWeightGrams: 150 },
    ],
    dinner: [
      {
        name: "Backpacker's Pantry Chili Mac",
        calories: 640,
        dryWeightGrams: 156,
        waterMl: 355,
      },
    ],
    snacks: [
      { name: "Trail Mix", calories: 240, dryWeightGrams: 120 },
      { name: "Clif Bar", calories: 250, quantity: 2, dryWeightGrams: 68 },
    ],
  },
  {
    breakfast: [
      {
        name: "Instant Oatmeal",
        calories: 180,
        quantity: 2,
        dryWeightGrams: 90,
        waterMl: 177,
      },
      { name: "Instant Coffee", calories: 5, dryWeightGrams: 10, waterMl: 237 },
    ],
    lunch: [
      {
        name: "Ramen Noodles",
        calories: 380,
        dryWeightGrams: 85,
        waterMl: 473,
      },
      { name: "Summer Sausage", calories: 420, dryWeightGrams: 150 },
      { name: "Tortillas", calories: 110, quantity: 2, dryWeightGrams: 30 },
    ],
    dinner: [
      {
        name: "Knorr Pasta Side",
        calories: 310,
        dryWeightGrams: 128,
        waterMl: 414,
      },
      { name: "Beef Jerky", calories: 280, dryWeightGrams: 85 },
    ],
    snacks: [
      { name: "Snickers", calories: 240, quantity: 2, dryWeightGrams: 52 },
      { name: "Trail Mix", calories: 240, dryWeightGrams: 120 },
    ],
  },
  {
    breakfast: [
      {
        name: "Mashed Potatoes",
        calories: 250,
        dryWeightGrams: 57,
        waterMl: 237,
      },
      { name: "Instant Coffee", calories: 5, dryWeightGrams: 10, waterMl: 237 },
    ],
    lunch: [
      { name: "Tortillas", calories: 110, quantity: 4, dryWeightGrams: 30 },
      {
        name: "Peanut Butter Packet",
        calories: 190,
        quantity: 2,
        dryWeightGrams: 32,
      },
    ],
    dinner: [
      {
        name: "Backpacker's Pantry Chili Mac",
        calories: 640,
        dryWeightGrams: 156,
        waterMl: 355,
      },
    ],
    snacks: [
      { name: "Clif Bar", calories: 250, quantity: 2, dryWeightGrams: 68 },
      { name: "Electrolyte Mix", calories: 10, quantity: 2, dryWeightGrams: 8 },
    ],
  },
  {
    breakfast: [
      {
        name: "Instant Oatmeal",
        calories: 180,
        dryWeightGrams: 90,
        waterMl: 177,
      },
      { name: "Instant Coffee", calories: 5, dryWeightGrams: 10, waterMl: 237 },
    ],
    lunch: [
      { name: "Beef Jerky", calories: 280, dryWeightGrams: 85 },
      { name: "Snickers", calories: 240, dryWeightGrams: 52 },
    ],
    dinner: [],
    snacks: [],
  },
];

export async function seedMealPlanItems(day: MealPlanDay) {
  const menu = MENUS[(day.dayNumber - 1) % MENUS.length]!;

  const items = (Object.entries(menu) as [MealName, MenuItem[]][]).flatMap(
    ([meal, menuItems]) =>
      menuItems.map((item) => ({
        name: item.name,
        calories: item.calories,
        meal,
        quantity: item.quantity ?? 1,
        waterMl: item.waterMl ?? null,
        dryWeightGrams: item.dryWeightGrams ?? null,
        mealPlanDayId: day.id,
      })),
  );

  if (items.length === 0) return;

  await db.mealPlanItem.createMany({ data: items });
}
