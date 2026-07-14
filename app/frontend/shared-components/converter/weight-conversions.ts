import type { ConversionConfig } from "$/frontend/shared-components/converter/types";

export enum WeightUnit {
  grams = "grams",
  kilograms = "kilograms",
  ounces = "ounces",
  pounds = "pounds",
}

export const WEIGHT_UNIT_ORDER: WeightUnit[] = [
  WeightUnit.grams,
  WeightUnit.kilograms,
  WeightUnit.ounces,
  WeightUnit.pounds,
] as const;

export const WEIGHT_UNIT_ABBREVIATION: Record<WeightUnit, string> = {
  grams: "g",
  kilograms: "kg",
  ounces: "oz",
  pounds: "lb",
};

export const WEIGHT_UNIT_LABEL: Record<WeightUnit, string> = {
  grams: "Grams (g)",
  kilograms: "Kilograms (kg)",
  ounces: "Ounces (oz)",
  pounds: "Pounds (lb)",
};

export const WEIGHT_CONVERSIONS: ConversionConfig<WeightUnit> = {
  order: WEIGHT_UNIT_ORDER,
  labels: WEIGHT_UNIT_LABEL,
  multipliers: {
    grams: 1,
    kilograms: 1000,
    ounces: 28.349523125,
    pounds: 453.59237,
  },
};

// Backpackers in the US weigh individual gear/food items in ounces far more
// often than pounds, so ounces is the imperial default here (unlike
// fluid-conversions, where cups is the everyday US unit).
export const WEIGHT_REGION_DEFAULT_UNIT: Partial<Record<string, WeightUnit>> = {
  US: WeightUnit.ounces,
};

export const WEIGHT_DEFAULT_UNIT: WeightUnit = WeightUnit.grams;

// Maps a small unit to the next larger unit in its system, for display
// "roll-up" (e.g. showing 26 oz as 1.63 lb). Kilograms and pounds have no
// entry since they're already the larger unit in their system.
export const WEIGHT_ROLLUP_UNIT: Partial<Record<WeightUnit, WeightUnit>> = {
  grams: WeightUnit.kilograms,
  ounces: WeightUnit.pounds,
};

// A value rolls up to the next unit once it reaches 1.5x that unit (e.g.
// 24 oz, being 1.5 lb, displays as "1.5 lb" rather than "24 oz").
export const WEIGHT_ROLLUP_THRESHOLD = 1.5;
