import { parseUserAgent } from "$/frontend/utils/parse-user-agent";
import { describe, expect, it } from "bun:test";

describe("parseUserAgent", () => {
  it("identifies Chrome on macOS as a desktop", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({
      label: "Chrome on macOS",
      deviceClass: "desktop",
    });
  });

  it("identifies Safari on iPhone as mobile", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ua)).toEqual({
      label: "Safari on iOS",
      deviceClass: "mobile",
    });
  });

  it("identifies Safari on iPad as a tablet", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ua)).toEqual({
      label: "Safari on iOS",
      deviceClass: "tablet",
    });
  });

  it("identifies Chrome on Android as mobile", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({
      label: "Chrome on Android",
      deviceClass: "mobile",
    });
  });

  it("identifies a tablet-class Android UA without the Mobile token", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({
      label: "Chrome on Android",
      deviceClass: "tablet",
    });
  });

  it("identifies Edge on Windows rather than misreading it as Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
    expect(parseUserAgent(ua)).toEqual({
      label: "Edge on Windows",
      deviceClass: "desktop",
    });
  });

  it("identifies Firefox on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";
    expect(parseUserAgent(ua)).toEqual({
      label: "Firefox on Windows",
      deviceClass: "desktop",
    });
  });

  it("returns an unknown device for a null user agent", () => {
    expect(parseUserAgent(null)).toEqual({
      label: "Unknown device",
      deviceClass: "unknown",
    });
  });
});
