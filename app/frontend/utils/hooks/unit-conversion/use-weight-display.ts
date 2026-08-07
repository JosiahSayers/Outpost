import { usePreferredBoolean } from "$/frontend/account/use-preferred-boolean";
import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
  WEIGHT_ROLLUP_THRESHOLD,
  WEIGHT_ROLLUP_UNIT,
  weightUnitAbbreviation,
} from "$/frontend/shared-components/converter/weight-conversions";
import { useCallback } from "react";

export interface UseWeightDisplayOptions {
  decimalScale?: number;
}

// Formats a canonical-grams value for read-only display (e.g. "450 g" or
// "1.2 lb"), using the user's weight_viewing_unit account setting (falling
// back to locale detection if unset). Returns a
// formatter function rather than a formatted string so the hook can be
// called once per component and the formatter reused across a list (e.g.
// mapped table rows) without violating the rules of hooks.
//
// Whether large values roll up into the next unit instead of showing a
// decimal (e.g. 24 oz as "1 lb 8 oz" rather than "1.5 lb") is entirely
// governed by the user's weight_rollup account setting (default on) --
// callers don't get a say, so the setting means the same thing everywhere
// it's used.
export function useWeightDisplay({
  decimalScale = 2,
}: UseWeightDisplayOptions = {}) {
  const unit = usePreferredUnit(
    "weight_viewing_unit",
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );
  const rollUpEnabled = usePreferredBoolean("weight_rollup", true);

  return useCallback(
    (grams: number | null): string => {
      if (grams === null) return "";

      const rollupUnit = rollUpEnabled ? WEIGHT_ROLLUP_UNIT[unit] : undefined;
      const rollupThreshold =
        rollupUnit &&
        WEIGHT_ROLLUP_THRESHOLD * WEIGHT_CONVERSIONS.multipliers[rollupUnit];

      if (rollupUnit && rollupThreshold && grams >= rollupThreshold) {
        const rollupMultiplier = WEIGHT_CONVERSIONS.multipliers[rollupUnit];
        const unitMultiplier = WEIGHT_CONVERSIONS.multipliers[unit];
        const unitsPerRollup = rollupMultiplier / unitMultiplier;

        let whole = Math.floor(grams / rollupMultiplier);
        let remainder = Math.round(
          (grams - whole * rollupMultiplier) / unitMultiplier,
        );

        // Rounding the remainder up to the small unit can carry it into a
        // full rollup unit (e.g. 15.6 oz rounding to 16 oz === 1 lb).
        if (remainder >= unitsPerRollup) {
          whole += 1;
          remainder = 0;
        }

        const wholePart = `${whole} ${weightUnitAbbreviation(rollupUnit, whole)}`;
        return remainder === 0
          ? wholePart
          : `${wholePart} ${remainder} ${weightUnitAbbreviation(unit, remainder)}`;
      }

      const value = grams / WEIGHT_CONVERSIONS.multipliers[unit];
      // Round the same way the formatter will, so a value that displays as
      // "1" (e.g. 1.004 at decimalScale 2) is treated as singular.
      const rounded = Number(value.toFixed(decimalScale));
      const formatted = new Intl.NumberFormat(navigator.language, {
        maximumFractionDigits: decimalScale,
      }).format(value);

      return `${formatted} ${weightUnitAbbreviation(unit, rounded)}`;
    },
    [unit, decimalScale, rollUpEnabled],
  );
}
