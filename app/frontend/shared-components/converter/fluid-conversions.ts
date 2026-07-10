import type { ConversionConfig } from "$/frontend/shared-components/converter/types";

export type FluidUnit = "ml" | "liters" | "cupsUS" | "cupsImperial";

export const FLUID_UNIT_ORDER: FluidUnit[] = [
  "ml",
  "liters",
  "cupsUS",
  "cupsImperial",
];

export const FLUID_UNIT_LABEL: Record<FluidUnit, string> = {
  ml: "Milliliters (mL)",
  liters: "Liters (L)",
  cupsUS: "Cups (US)",
  cupsImperial: "Cups (Imperial)",
};

export const FLUID_CONVERSIONS: ConversionConfig<FluidUnit> = {
  order: FLUID_UNIT_ORDER,
  labels: FLUID_UNIT_LABEL,
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
export const FLUID_REGION_DEFAULT_UNIT: Partial<Record<string, FluidUnit>> = {
  US: "cupsUS",
};

export const FLUID_DEFAULT_UNIT: FluidUnit = "ml";
