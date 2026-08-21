import { reportStorageBeacon } from "$/frontend/utils/storage-beacon";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const BEACON_COOKIE = "outpost_storage_beacon";

function clearCookie() {
  document.cookie = `${BEACON_COOKIE}=; max-age=0; path=/`;
}

function capture() {
  return mock((_message: string, _attributes: Record<string, unknown>) => {});
}

function attributesOf(log: ReturnType<typeof capture>) {
  return log.mock.calls[0]![1];
}

describe("reportStorageBeacon", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearCookie();
  });

  it("reports both markers missing on a load with no prior beacon", () => {
    const log = capture();

    reportStorageBeacon(false, log);

    const attributes = attributesOf(log);
    expect(attributes.beaconSurvived).toBe(false);
    expect(attributes.cookieSurvived).toBe(false);
    expect(attributes.beaconAgeMs).toBeNull();
    expect(attributes.beaconWrittenWhileSignedIn).toBeNull();
    expect(attributes.storageAccessible).toBe(true);
  });

  it("reports both markers surviving on the next load, so an ordinary load reads as the baseline", () => {
    reportStorageBeacon(true, capture());

    const log = capture();
    reportStorageBeacon(true, log);

    const attributes = attributesOf(log);
    expect(attributes.beaconSurvived).toBe(true);
    expect(attributes.cookieSurvived).toBe(true);
    expect(attributes.beaconWrittenWhileSignedIn).toBe(true);
    expect(typeof attributes.beaconAgeMs).toBe("number");
  });

  it("distinguishes cookies being cleared on their own from the whole partition going away", () => {
    reportStorageBeacon(true, capture());
    // localStorage left intact, cookie jar emptied -- the signature of a
    // content blocker or ITP clearing cookies specifically.
    clearCookie();

    const log = capture();
    reportStorageBeacon(false, log);

    const attributes = attributesOf(log);
    expect(attributes.beaconSurvived).toBe(true);
    expect(attributes.cookieSurvived).toBe(false);
    expect(attributes.hasSession).toBe(false);
  });

  it("reports an ephemeral partition when neither marker comes back", () => {
    reportStorageBeacon(true, capture());
    window.localStorage.clear();
    clearCookie();

    const log = capture();
    reportStorageBeacon(false, log);

    const attributes = attributesOf(log);
    expect(attributes.beaconSurvived).toBe(false);
    expect(attributes.cookieSurvived).toBe(false);
    expect(attributes.storageAccessible).toBe(true);
  });

  it("separates storage being disabled outright from a value that went missing", () => {
    // happy-dom's localStorage isn't spy-able per-method, so swap the whole
    // accessor for one that throws the way Safari does with storage off.
    const original = Object.getOwnPropertyDescriptor(
      window,
      "localStorage",
    ) ?? { get: () => window.localStorage, configurable: true };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage disabled");
      },
    });

    const log = capture();
    try {
      reportStorageBeacon(false, log);
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }

    const attributes = attributesOf(log);
    expect(attributes.storageAccessible).toBe(false);
    expect(attributes.beaconSurvived).toBe(false);
  });

  it("carries the beacon's signed-in state forward from the load that wrote it", () => {
    reportStorageBeacon(true, capture());

    const log = capture();
    reportStorageBeacon(false, log);

    expect(attributesOf(log).beaconWrittenWhileSignedIn).toBe(true);
  });
});
