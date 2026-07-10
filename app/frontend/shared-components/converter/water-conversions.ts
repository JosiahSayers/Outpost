import type { ConversionConfig } from "$/frontend/shared-components/converter/types";

export type WaterUnit = "ml" | "liters" | "cupsUS" | "cupsImperial";

export const WATER_UNIT_ORDER: WaterUnit[] = [
  "ml",
  "liters",
  "cupsUS",
  "cupsImperial",
];

export const WATER_UNIT_LABEL: Record<WaterUnit, string> = {
  ml: "Milliliters (mL)",
  liters: "Liters (L)",
  cupsUS: "Cups (US)",
  cupsImperial: "Cups (Imperial)",
};

export const WATER_CONVERSIONS: ConversionConfig<WaterUnit> = {
  order: WATER_UNIT_ORDER,
  labels: WATER_UNIT_LABEL,
  multipliers: {
    ml: 1,
    liters: 1000,
    cupsUS: 236.5882365,
    cupsImperial: 284.130625,
  },
};

// Only the US commonly measures liquid volume in cups day-to-day; everywhere
// else defaults to ml. cupsImperial is selectable but never auto-defaulted —
// there's no reliable modern regional signal for it.
export const WATER_REGION_DEFAULT_UNIT: Partial<Record<string, WaterUnit>> = {
  US: "cupsUS",
};

export const WATER_DEFAULT_UNIT: WaterUnit = "ml";
