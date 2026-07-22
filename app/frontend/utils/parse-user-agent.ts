export type DeviceClass = "desktop" | "mobile" | "tablet" | "unknown";

export interface ParsedUserAgent {
  label: string;
  deviceClass: DeviceClass;
}

function detectBrowser(ua: string): string | null {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Version\/.*Safari/.test(ua)) return "Safari";
  return null;
}

function detectOS(ua: string): string | null {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

function detectDeviceClass(ua: string): DeviceClass {
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    return "tablet";
  }
  if (/iPhone|iPod/.test(ua) || /Mobi/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export function parseUserAgent(ua: string | null): ParsedUserAgent {
  if (!ua) {
    return { label: "Unknown device", deviceClass: "unknown" };
  }

  const browser = detectBrowser(ua);
  const os = detectOS(ua);

  const label =
    browser && os ? `${browser} on ${os}` : (browser ?? os ?? "Unknown device");

  return { label, deviceClass: detectDeviceClass(ua) };
}
