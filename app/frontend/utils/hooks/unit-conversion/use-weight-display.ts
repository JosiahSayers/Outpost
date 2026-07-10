import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
  WEIGHT_UNIT_ABBREVIATION,
} from "$/frontend/shared-components/converter/weight-conversions";
import { useCallback } from "react";

// Formats a canonical-grams value for read-only display (e.g. "450 g" or
// "1.2 lb"), using the same locale-detected unit as WeightConverter so a
// displayed value matches what an adjacent input would show. Returns a
// formatter function rather than a formatted string so the hook can be
// called once per component and the formatter reused across a list (e.g.
// mapped table rows) without violating the rules of hooks.
export function useWeightDisplay(decimalScale = 2) {
  const unit = useDefaultUnit(WEIGHT_REGION_DEFAULT_UNIT, WEIGHT_DEFAULT_UNIT);

  return useCallback(
    (grams: number | null): string => {
      if (grams === null) return "";

      const value = grams / WEIGHT_CONVERSIONS.multipliers[unit];
      const formatted = new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: decimalScale,
      }).format(value);

      return `${formatted} ${WEIGHT_UNIT_ABBREVIATION[unit]}`;
    },
    [unit, decimalScale],
  );
}
