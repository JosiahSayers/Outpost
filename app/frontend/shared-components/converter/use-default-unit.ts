import { detectDefaultUnitFromLocale } from "$/frontend/shared-components/converter/detect-default-unit";
import { useMemo } from "react";

export function useDefaultUnit<Unit extends string>(
  regionDefaults: Partial<Record<string, Unit>>,
  fallback: Unit,
): Unit {
  return useMemo(
    () =>
      detectDefaultUnitFromLocale(navigator.language, regionDefaults, fallback),
    [regionDefaults, fallback],
  );
}
