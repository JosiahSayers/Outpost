import { isIos, isStandalone } from "$/frontend/utils/platform";
import { afterEach, describe, expect, it } from "bun:test";

const defaultUserAgent = navigator.userAgent;
const defaultMaxTouchPoints = navigator.maxTouchPoints;

function stubMatchMedia(standaloneMatches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches: query === "(display-mode: standalone)" && standaloneMatches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

function stubNavigatorStandalone(value: boolean | undefined) {
  if (value === undefined) {
    // @ts-expect-error -- undoing the per-test stub
    delete navigator.standalone;
    return;
  }
  Object.defineProperty(navigator, "standalone", {
    value,
    configurable: true,
  });
}

function stubUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

function stubMaxTouchPoints(points: number) {
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: points,
    configurable: true,
  });
}

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_LEGACY_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
// Modern iPadOS Safari's default UA masquerades as desktop macOS Safari.
const IPAD_DESKTOP_MASQUERADE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

afterEach(() => {
  stubMatchMedia(false);
  stubNavigatorStandalone(undefined);
  stubUserAgent(defaultUserAgent);
  stubMaxTouchPoints(defaultMaxTouchPoints);
});

describe("isStandalone", () => {
  it("is false when neither signal indicates standalone", () => {
    stubMatchMedia(false);
    stubNavigatorStandalone(undefined);
    expect(isStandalone()).toBe(false);
  });

  it("is true when the display-mode media query matches", () => {
    stubMatchMedia(true);
    expect(isStandalone()).toBe(true);
  });

  it("is true when navigator.standalone is set, even if the media query doesn't match", () => {
    stubMatchMedia(false);
    stubNavigatorStandalone(true);
    expect(isStandalone()).toBe(true);
  });

  it("is false when navigator.standalone is explicitly false", () => {
    stubMatchMedia(false);
    stubNavigatorStandalone(false);
    expect(isStandalone()).toBe(false);
  });
});

describe("isIos", () => {
  it("is true for an iPhone UA", () => {
    stubUserAgent(IPHONE_UA);
    expect(isIos()).toBe(true);
  });

  it("is true for an iPad UA that still identifies itself as iPad", () => {
    stubUserAgent(IPAD_LEGACY_UA);
    expect(isIos()).toBe(true);
  });

  it("is true for modern iPadOS Safari's desktop-masquerade UA when touch points indicate a touchscreen", () => {
    stubUserAgent(IPAD_DESKTOP_MASQUERADE_UA);
    stubMaxTouchPoints(5);
    expect(isIos()).toBe(true);
  });

  it("is false for a real Mac with the same desktop UA and no touch points", () => {
    stubUserAgent(MAC_UA);
    stubMaxTouchPoints(0);
    expect(isIos()).toBe(false);
  });

  it("is false for Android", () => {
    stubUserAgent(ANDROID_UA);
    stubMaxTouchPoints(5);
    expect(isIos()).toBe(false);
  });
});
