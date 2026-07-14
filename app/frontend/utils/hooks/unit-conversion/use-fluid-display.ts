import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
  FLUID_REGION_DEFAULT_UNIT,
  FLUID_UNIT_ABBREVIATION,
} from "$/frontend/shared-components/converter/fluid-conversions";
import { useCallback } from "react";

// Formats a canonical-ml value for read-only display (e.g. "500 mL" or
// "2.1 cups"), using the user's liquid_viewing_unit account setting
// (falling back to locale detection if unset). Returns a
// formatter function rather than a formatted string so the hook can be
// called once per component and the formatter reused across a list (e.g.
// mapped table rows) without violating the rules of hooks.
export function useFluidDisplay(decimalScale = 2) {
  const unit = usePreferredUnit(
    "liquid_viewing_unit",
    FLUID_REGION_DEFAULT_UNIT,
    FLUID_DEFAULT_UNIT,
  );

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
