import type { ConversionConfig } from "$/frontend/shared-components/converter/types";

export type WeightUnit = "grams" | "kilograms" | "ounces" | "pounds";

export const WEIGHT_UNIT_ORDER: WeightUnit[] = [
  "grams",
  "kilograms",
  "ounces",
  "pounds",
];

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
  US: "ounces",
};

export const WEIGHT_DEFAULT_UNIT: WeightUnit = "grams";
