/**
 * Trail & Summit – Backpacking Trip Planner
 * Mantine Theme
 *
 * Vibe:    Rugged & earthy — forest greens, bark browns, stone grays
 * Fonts:   Headings → "Playfair Display" (weathered gravitas, not tech-clean)
 *          Body     → "Source Sans 3" (legible on trail notes and packed itineraries)
 * Radius:  Slightly softened — worn edges, not corporate sharp
 * Shadows: Layered like overcast mountain light, no hard candy-box glow
 *
 * Google Fonts import (add to your index.html <head>):
 *   <link rel="preconnect" href="https://fonts.googleapis.com" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 *   <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Source+Sans+3:wght@300;400;600&display=swap" rel="stylesheet" />
 */

import {
  Badge,
  Button,
  Card,
  Divider,
  Notification,
  Paper,
  Select,
  TextInput,
  Textarea,
  alpha,
  createTheme,
  getPrimaryShade,
  rem,
  type CSSVariablesResolver,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";

// ---------------------------------------------------------------------------
// Color palettes — 10 shades required by Mantine (index 0 = lightest, 9 = darkest)
// ---------------------------------------------------------------------------

/** Forest green — primary brand color */
export const trailGreen = [
  "#edf5ee", // 0 – near-white with green tint
  "#d2e8d4", // 1
  "#a9d1ae", // 2
  "#7db985", // 3
  "#56a35f", // 4
  "#3d8f46", // 5 – mid-tone, safe on white
  "#2f7a38", // 6 – primary action shade (light mode)
  "#236029", // 7
  "#184a1e", // 8
  "#0e3213", // 9 – near-black green
] as const;

/** Bark brown — secondary / accent */
export const barkBrown = [
  "#f5f0e8", // 0
  "#e8dcc8", // 1
  "#d4c0a0", // 2
  "#bda07a", // 3
  "#a8835a", // 4
  "#8f6b40", // 5
  "#7a5830", // 6 – main accent
  "#614325", // 7
  "#4a301a", // 8
  "#321f0e", // 9
] as const;

/** Stone gray — neutral UI surfaces */
export const stoneGray = [
  "#f4f2ef", // 0 – warm off-white background
  "#e8e4de", // 1
  "#d3cdc4", // 2
  "#bcb3a7", // 3
  "#a49b8e", // 4
  "#8c8175", // 5
  "#746b5e", // 6
  "#5c5449", // 7
  "#433d34", // 8
  "#2c2720", // 9 – near-black with warm tint
] as const;

/** Trail dust — muted amber for warnings / highlights */
export const trailDust = [
  "#fdf6e8",
  "#f9eacc",
  "#f2d49c",
  "#e8bc6c",
  "#dfa647",
  "#d49230",
  "#c07e22",
  "#a06519",
  "#7c4d11",
  "#56340a",
] as const;

/** Lookup by theme color name — shared by the dark-mode CSS variables
 * resolver below and by components that intentionally want a fixed shade
 * regardless of color scheme (e.g. the marketing hero gradient). */
export const customPalettes = {
  "trail-green": trailGreen,
  "bark-brown": barkBrown,
  "stone-gray": stoneGray,
  "trail-dust": trailDust,
};

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export const trailTheme = createTheme({
  // --- Identity ----------------------------------------------------------
  primaryColor: "trail-green",
  primaryShade: { light: 6, dark: 5 },

  // Auto-flip text color on colored backgrounds for accessibility
  autoContrast: true,
  luminanceThreshold: 0.35,

  // --- Palette -----------------------------------------------------------
  colors: {
    "trail-green": trailGreen,
    "bark-brown": barkBrown,
    "stone-gray": stoneGray,
    "trail-dust": trailDust,
  },

  // --- Typography --------------------------------------------------------
  fontFamily:
    '"Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif',

  headings: {
    fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
    fontWeight: "700",
    sizes: {
      h1: { fontSize: rem(36), lineHeight: "1.2", fontWeight: "900" },
      h2: { fontSize: rem(28), lineHeight: "1.3", fontWeight: "700" },
      h3: { fontSize: rem(22), lineHeight: "1.35", fontWeight: "700" },
      h4: { fontSize: rem(18), lineHeight: "1.4", fontWeight: "600" },
      h5: { fontSize: rem(15), lineHeight: "1.45", fontWeight: "600" },
      h6: { fontSize: rem(13), lineHeight: "1.5", fontWeight: "600" },
    },
  },

  fontSizes: {
    xs: rem(11),
    sm: rem(13),
    md: rem(15),
    lg: rem(17),
    xl: rem(20),
  },

  lineHeights: {
    xs: "1.3",
    sm: "1.4",
    md: "1.55",
    lg: "1.6",
    xl: "1.65",
  },

  // --- Shape & Spacing ---------------------------------------------------
  // Slightly softened corners — worn gear, not tech gadgets
  defaultRadius: "sm",

  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(8),
    lg: rem(12),
    xl: rem(20),
  },

  spacing: {
    xs: rem(6),
    sm: rem(10),
    md: rem(16),
    lg: rem(24),
    xl: rem(40),
  },

  // --- Shadows -----------------------------------------------------------
  // Warm-tinted, diffuse — like afternoon light on a canyon wall
  shadows: {
    xs: "0 1px 2px rgba(46, 38, 28, 0.10)",
    sm: "0 2px 6px rgba(46, 38, 28, 0.12)",
    md: "0 4px 14px rgba(46, 38, 28, 0.14)",
    lg: "0 8px 28px rgba(46, 38, 28, 0.16)",
    xl: "0 16px 48px rgba(46, 38, 28, 0.20)",
  },

  // --- Breakpoints -------------------------------------------------------
  breakpoints: {
    xs: "30em",
    sm: "48em",
    md: "64em",
    lg: "80em",
    xl: "96em",
  },

  // --- Component overrides -----------------------------------------------
  components: {
    Button: Button.extend({
      defaultProps: {
        radius: "sm",
      },
      styles: {
        root: {
          fontFamily: '"Source Sans 3", sans-serif',
          fontWeight: "600",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontSize: rem(13),
        },
      },
    }),

    Badge: Badge.extend({
      defaultProps: {
        // Default to the primary theme color and a sensible size.
        // Override per-badge with color="bark-brown" etc. as needed.
        color: "trail-green",
        variant: "light",
        size: "sm",
        radius: 2,
      },
      styles: {
        label: {
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: "600",
        },
      },
    }),

    Card: Card.extend({
      defaultProps: {
        radius: "md",
        shadow: "sm",
        padding: "lg",
      },
    }),

    Paper: Paper.extend({
      defaultProps: {
        radius: "md",
        shadow: "xs",
      },
    }),

    TextInput: TextInput.extend({
      styles: {
        input: {
          borderWidth: "1.5px",
        },
      },
    }),

    Textarea: Textarea.extend({
      styles: {
        input: {
          borderWidth: "1.5px",
        },
      },
    }),

    Select: Select.extend({
      styles: {
        input: {
          borderWidth: "1.5px",
        },
      },
    }),

    Divider: Divider.extend({
      defaultProps: {
        color: "stone-gray.2",
      },
    }),

    Notification: Notification.extend({
      defaultProps: {
        radius: "sm",
      },
    }),

    DateInput: DateInput.extend({
      // `styles` is also invoked for the calendar's per-day cells, whose
      // weekend/outside/disabled state isn't part of DateInput's own public
      // props type but is present on the object at runtime.
      styles: (_theme, props) => {
        const dayProps = props as unknown as {
          weekend?: boolean;
          disabled?: boolean;
          outside?: boolean;
        };
        return {
          day:
            dayProps.weekend && !dayProps.disabled && !dayProps.outside
              ? { color: "var(--mantine-color-bark-brown-6)" }
              : {},
        };
      },
    }),
  },
});

// ---------------------------------------------------------------------------
// Dark-mode CSS variables
// ---------------------------------------------------------------------------

// The palettes above were tuned for light backgrounds only. Rather than
// hand-picking a second set of dark-mode colors, reuse the same 10-shade
// ramp already designed for each palette: shade N in light mode becomes
// shade (9 - N) in dark mode, so a near-white background (shade 0) becomes
// near-black (shade 9), a dark accent text color (shade 7) becomes a light
// one (shade 2), and so on. This covers every component that references an
// explicit shade index (e.g. `bg="trail-green.0"`, `c="bark-brown.7"`)
// without touching each call site individually.
export const trailThemeCssVariablesResolver: CSSVariablesResolver = (theme) => {
  const dark: Record<string, string> = {
    // Warm, light-tuned shadows read as nearly invisible on dark surfaces —
    // switch to black-based shadows at higher opacity for the same depth.
    "--mantine-shadow-xs": "0 1px 2px rgba(0, 0, 0, 0.36)",
    "--mantine-shadow-sm": "0 2px 6px rgba(0, 0, 0, 0.40)",
    "--mantine-shadow-md": "0 4px 14px rgba(0, 0, 0, 0.44)",
    "--mantine-shadow-lg": "0 8px 28px rgba(0, 0, 0, 0.48)",
    "--mantine-shadow-xl": "0 16px 48px rgba(0, 0, 0, 0.55)",
  };

  // Mantine derives a few variant-specific variables by pointing at a raw
  // shade index via CSS `var()` — e.g. dark-mode `-light-color` is literally
  // `var(--mantine-color-{name}-0)`. The loop below repoints that raw index
  // to a different literal color for dark mode, so anything that resolves
  // *through* it (variant="light" text, variant="outline" text/border, bare
  // `c="trail-green"` text) would silently inherit the wrong, near-invisible
  // color unless pinned back to the original (un-reversed) shade here.
  const darkPrimaryShade = getPrimaryShade(theme, "dark");

  Object.entries(customPalettes).forEach(([name, shades]) => {
    shades.forEach((_, index) => {
      dark[`--mantine-color-${name}-${index}`] = shades[9 - index]!;
    });

    // Shade 0 is only ever used as a subtle "tinted card" background (trip
    // header, meal-plan cards, admin row highlights) — never as text. The
    // straight reversal above maps it to shade 9, the palette's most
    // saturated tone, which reads as a vivid, attention-grabbing block
    // instead of the barely-there tint it is in light mode. Use a
    // low-opacity wash of the accent color instead, so it stays a subtle
    // surface in dark mode too.
    dark[`--mantine-color-${name}-0`] = alpha(shades[darkPrimaryShade]!, 0.1);

    dark[`--mantine-color-${name}-text`] = shades[4]!;
    dark[`--mantine-color-${name}-light-color`] = shades[0]!;
    dark[`--mantine-color-${name}-outline`] =
      shades[Math.max(darkPrimaryShade - 4, 0)]!;

    // Mantine's default dark-mode `-light` background is
    // `darken(shade[9], 0.5)` — since our shade 9 is already a near-black
    // tone, that darkens it almost to solid black, reading as a harsh block
    // against the app's softer dark-gray surfaces. Use a low-opacity tint of
    // the dark-mode accent shade instead, so `variant="light"` reads as a
    // colored chip rather than a near-opaque rectangle.
    dark[`--mantine-color-${name}-light`] = alpha(
      shades[darkPrimaryShade]!,
      0.18,
    );
    dark[`--mantine-color-${name}-light-hover`] = alpha(
      shades[darkPrimaryShade]!,
      0.28,
    );
  });

  return { variables: {}, light: {}, dark };
};
