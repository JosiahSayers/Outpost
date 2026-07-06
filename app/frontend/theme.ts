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
  createTheme,
  rem,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";

// ---------------------------------------------------------------------------
// Color palettes — 10 shades required by Mantine (index 0 = lightest, 9 = darkest)
// ---------------------------------------------------------------------------

/** Forest green — primary brand color */
const trailGreen = [
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
const barkBrown = [
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
const stoneGray = [
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
const trailDust = [
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
