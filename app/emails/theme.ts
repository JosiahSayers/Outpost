/**
 * Design tokens for transactional emails.
 *
 * Mirrors the brand values in app/frontend/theme.ts (trailTheme), but as
 * plain strings — email clients render static HTML/CSS, so they can't
 * consume Mantine's theme object, CSS variables, or (reliably) the
 * Playfair Display / Source Sans 3 webfonts loaded via Google Fonts.
 *
 * If the Mantine theme's brand colors, fonts, radius, or spacing change,
 * update both files.
 */

export const emailColors = {
  trailGreen: {
    0: "#edf5ee",
    1: "#d2e8d4",
    6: "#2f7a38", // primary action / CTA background
    7: "#236029", // CTA hover/border
    9: "#0e3213",
  },
  barkBrown: {
    0: "#f5f0e8",
    6: "#7a5830", // secondary accent
    9: "#321f0e",
  },
  stoneGray: {
    0: "#f4f2ef", // page background
    2: "#d3cdc4", // borders / dividers
    5: "#8c8175", // muted footer text
    9: "#2c2720", // body text
  },
  trailDust: {
    6: "#c07e22", // warnings / highlights
  },
  /** Compass mark color from the logo SVGs — not part of the Mantine palette. */
  compassGold: "#ba7517",
  white: "#ffffff",
} as const;

export const emailFonts = {
  // Google Fonts webfonts don't reliably load in email clients, so the
  // fallback stacks are what actually renders for most recipients.
  heading: '"Playfair Display", Georgia, "Times New Roman", serif',
  body: '"Source Sans 3", "Segoe UI", -apple-system, sans-serif',
} as const;

export const emailRadius = {
  sm: "4px", // buttons, inputs
  md: "8px", // cards
} as const;

export const emailSpacing = {
  sm: "10px",
  md: "16px",
  lg: "24px",
  xl: "40px",
} as const;

/**
 * Absolute URL for the header logo. Email clients fetch images over HTTP
 * from the recipient's inbox, not from local disk, so this points at
 * /email-assets, which serves the original file straight from disk by
 * filename with no auth required. In staging/production Caddy serves this
 * path itself from a shared volume (docker-compose.staging.yml), so
 * Express never handles the request traffic; app/routers/email-assets.ts
 * serves the same path for local dev, where there's no Caddy in front.
 * This deliberately does NOT reuse the frontend-bundled logo import —
 * Bun's bundler content-hashes that asset's filename on every build,
 * which would make this URL unstable.
 */
const APP_URL =
  process.env.BETTER_AUTH_URL ?? "https://outpost.sayerscloud.com";
export const emailLogoUrl = `${APP_URL}/email-assets/outpost-logo-no-tagline.png`;
