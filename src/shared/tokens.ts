/**
 * HYPERREEL "GENZ" design tokens.
 * Keep in sync with the CSS custom properties in src/app/globals.css.
 */

export const TOKENS = {
  acid: "#C6FF3D",
  coral: "#FF4D2E",
  ink: "#0B0B0C",
  inkSoft: "#131316",
  chrome: "#E8E8EC",
} as const;

export type TokenColor = keyof typeof TOKENS;
