export function detectDefaultUnitFromLocale<Unit extends string>(
  locale: string,
  regionDefaults: Partial<Record<string, Unit>>,
  fallback: Unit,
): Unit {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    if (!region) return fallback;
    return regionDefaults[region] ?? fallback;
  } catch {
    return fallback;
  }
}
