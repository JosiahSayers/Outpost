import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";

// Resolves a boolean-flag account setting: the signed-in user's stored value
// if they've set one, otherwise `fallback`. AccountSettingValue only stores
// strings, so boolean settings are persisted as "true"/"false".
export function usePreferredBoolean(slug: string, fallback: boolean): boolean {
  const { settings } = useAccountSettingsContext();
  const stored = settings?.find((setting) => setting.slug === slug)?.value;

  if (stored === "true") return true;
  if (stored === "false") return false;
  return fallback;
}
