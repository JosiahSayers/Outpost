import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";

// Resolves the unit a component should use: the signed-in user's stored
// account setting for `slug` if they've set one, otherwise the same
// locale-detected fallback used before account settings existed. Falling
// back this way means an unset setting behaves exactly like today, and
// components outside AccountSettingsProvider (e.g. in tests) degrade to
// locale detection instead of crashing.
export function usePreferredUnit<Unit extends string>(
  slug: string,
  regionDefaults: Partial<Record<string, Unit>>,
  fallback: Unit,
): Unit {
  const { settings } = useAccountSettingsContext();
  const detected = useDefaultUnit(regionDefaults, fallback);
  const stored = settings?.find((setting) => setting.slug === slug)?.value;

  return stored ? (stored as Unit) : detected;
}
