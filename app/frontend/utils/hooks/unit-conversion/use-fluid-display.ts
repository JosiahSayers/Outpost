import {
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
  FLUID_REGION_DEFAULT_UNIT,
  FLUID_UNIT_ABBREVIATION,
} from "$/frontend/shared-components/converter/fluid-conversions";
import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import { useCallback } from "react";

// Formats a canonical-ml value for read-only display (e.g. "500 mL" or
// "2.1 cups"), using the same locale-detected unit as FluidConverter so a
// displayed value matches what an adjacent input would show. Returns a
// formatter function rather than a formatted string so the hook can be
// called once per component and the formatter reused across a list (e.g.
// mapped table rows) without violating the rules of hooks.
export function useFluidDisplay(decimalScale = 2) {
  const unit = useDefaultUnit(FLUID_REGION_DEFAULT_UNIT, FLUID_DEFAULT_UNIT);

  return useCallback(
    (ml: number | null): string => {
      if (ml === null) return "";

      const value = ml / FLUID_CONVERSIONS.multipliers[unit];
      const formatted = new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: decimalScale,
      }).format(value);

      return `${formatted} ${FLUID_UNIT_ABBREVIATION[unit]}`;
    },
    [unit, decimalScale],
  );
}
