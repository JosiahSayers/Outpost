import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
  WEIGHT_ROLLUP_THRESHOLD,
  WEIGHT_ROLLUP_UNIT,
  WEIGHT_UNIT_ABBREVIATION,
} from "$/frontend/shared-components/converter/weight-conversions";
import { useCallback } from "react";

export interface UseWeightDisplayOptions {
  decimalScale?: number;
  // When true, values that are large for the display unit are shown in the
  // next larger unit instead (e.g. 26 oz displays as "1.63 lb"). Off by
  // default so lists of individually-entered weights stay in a consistent
  // unit; opt in for places (like totals) where the unit doesn't matter.
  rollUp?: boolean;
}

// Formats a canonical-grams value for read-only display (e.g. "450 g" or
// "1.2 lb"), using the same locale-detected unit as WeightConverter so a
// displayed value matches what an adjacent input would show. Returns a
// formatter function rather than a formatted string so the hook can be
// called once per component and the formatter reused across a list (e.g.
// mapped table rows) without violating the rules of hooks.
export function useWeightDisplay({
  decimalScale = 2,
  rollUp = false,
}: UseWeightDisplayOptions = {}) {
  const unit = useDefaultUnit(WEIGHT_REGION_DEFAULT_UNIT, WEIGHT_DEFAULT_UNIT);

  return useCallback(
    (grams: number | null): string => {
      if (grams === null) return "";

      const rollupUnit = rollUp ? WEIGHT_ROLLUP_UNIT[unit] : undefined;
      const rollupThreshold =
        rollupUnit &&
        WEIGHT_ROLLUP_THRESHOLD * WEIGHT_CONVERSIONS.multipliers[rollupUnit];
      const displayUnit =
        rollupUnit && rollupThreshold && grams >= rollupThreshold
          ? rollupUnit
          : unit;

      const value = grams / WEIGHT_CONVERSIONS.multipliers[displayUnit];
      const formatted = new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: decimalScale,
      }).format(value);

      return `${formatted} ${WEIGHT_UNIT_ABBREVIATION[displayUnit]}`;
    },
    [unit, decimalScale, rollUp],
  );
}
