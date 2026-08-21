import * as Sentry from "@sentry/react";

const BEACON_KEY = "outpost.storage-beacon";
const BEACON_COOKIE = "outpost_storage_beacon";

// Matched to the session cookie's own lifetime (better-auth defaults
// session.expiresIn to 7d, and writes the cookie with that Max-Age) so a
// missing marker never just means the marker expired sooner than the thing
// it's standing in for.
const BEACON_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface Beacon {
  writtenAt: number;
  signedIn: boolean;
}

export interface StorageBeaconReading {
  storageAccessible: boolean;
  beaconSurvived: boolean;
  beaconAgeMs: number | null;
  beaconWrittenWhileSignedIn: boolean | null;
  cookieSurvived: boolean;
}

function readBeacon(): { accessible: boolean; beacon: Beacon | null } {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(BEACON_KEY);
  } catch {
    // Safari throws on localStorage access when storage is disabled
    // outright, which is a materially different answer from "storage works
    // and the value is gone" -- keep the two apart.
    return { accessible: false, beacon: null };
  }

  if (!raw) {
    return { accessible: true, beacon: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Beacon).writtenAt === "number"
    ) {
      return { accessible: true, beacon: parsed as Beacon };
    }
  } catch {
    // Fall through -- a malformed value is as good as an absent one here.
  }

  return { accessible: true, beacon: null };
}

function readBeaconCookie(): boolean {
  return document.cookie.split(";").some((entry) => {
    const [name, ...value] = entry.trim().split("=");
    // Require a value, not just the name: a cookie that's been emptied
    // carries no more information than an absent one, and some deletion
    // paths leave the bare `name=` behind rather than dropping the entry.
    return name === BEACON_COOKIE && value.join("=").length > 0;
  });
}

function writeBeacon(signedIn: boolean): void {
  const beacon: Beacon = { writtenAt: Date.now(), signedIn };

  try {
    window.localStorage.setItem(BEACON_KEY, JSON.stringify(beacon));
  } catch {
    // Nothing to do -- the next read reports storageAccessible: false, which
    // is itself the finding.
  }

  // `secure` would stop the cookie being set at all over plain http, which
  // is how the dev server runs.
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${BEACON_COOKIE}=1; path=/; max-age=${BEACON_MAX_AGE_SECONDS}; samesite=lax${secure}`;
}

export function readStorageBeacon(): StorageBeaconReading {
  const { accessible, beacon } = readBeacon();

  return {
    storageAccessible: accessible,
    beaconSurvived: beacon !== null,
    beaconAgeMs: beacon ? Date.now() - beacon.writtenAt : null,
    beaconWrittenWhileSignedIn: beacon?.signedIn ?? null,
    cookieSurvived: readBeaconCookie(),
  };
}

/**
 * Diagnostic for BTP-150 / OUTPOST-E. One user is signed out every time they
 * close their Safari tab and come back, even though the session cookie is
 * persistent (Max-Age 7d) and the backend has never once seen a cookie it
 * rejected -- stashSession's "cookie present but no session resolved" branch
 * has no hits at all. So the cookie isn't arriving, which makes this a
 * browser-storage question rather than an auth one, and nothing we can log
 * server-side tells the possibilities apart.
 *
 * Leave two independent markers behind on every page load and report which
 * of them came back on the next one:
 *
 * - localStorage gone, cookie gone -> the whole storage partition is
 *   ephemeral (Private Browsing, or an isolated in-app browsing context)
 * - localStorage kept, cookie gone -> something clears cookies specifically
 *   (a content blocker / privacy extension, or ITP)
 * - both kept, no session -> only our auth cookie is being lost, so the
 *   problem is its attributes or the server that sets it
 * - both kept, session present -> working normally, and this load is the
 *   baseline the other three get compared against
 *
 * Both markers are rewritten after each report, so every load measures the
 * gap since the previous load rather than only the gap since sign-in -- the
 * reported failure happens on a load where no sign-in took place.
 *
 * `log` defaults to the real Sentry logger; tests inject a spy instead of
 * reaching for `mock.module`.
 */
export function reportStorageBeacon(
  hasSession: boolean,
  log: (message: string, attributes: Record<string, unknown>) => void = (
    message,
    attributes,
  ) => Sentry.logger.warn(message, attributes),
): void {
  const reading = readStorageBeacon();

  log("Storage beacon check", {
    ...reading,
    hasSession,
    // A genuine first-ever load and a load that lost its markers are
    // indistinguishable from the client, so record how the tab was entered
    // too. `document.referrer` is empty when the tab was opened from outside
    // the browser -- the Messages link in the BTP-150 report -- which is
    // exactly the entry path under investigation.
    referrer: document.referrer || null,
    displayMode: window.matchMedia("(display-mode: standalone)").matches
      ? "standalone"
      : "browser",
  });

  writeBeacon(hasSession);
}
