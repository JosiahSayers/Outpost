import { detectOS } from "$/frontend/utils/parse-user-agent";

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ((window.navigator as Navigator & { standalone?: boolean }).standalone ??
      false)
  );
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  if (detectOS(ua) === "iOS") return true;

  // iPadOS Safari's default UA reports as "Macintosh" (desktop-class) unless
  // the user has turned off "Request Desktop Website" -- a real Mac never
  // reports touch points, so this heuristic catches modern iPadOS Safari in
  // its default desktop-masquerade mode. iPads have the same push-requires-
  // install limitation as iPhones, so they need to be caught here too.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}
