import { clampChroma, converter, formatHex, parse, wcagContrast } from "culori";

// One accent color in, a full brand theme out (light + dark), with WCAG contrast
// guaranteed. Runs on the server at build time, so culori never reaches the browser.

const toOklch = converter("oklch");

// Same lightness steps as Sufra's own coral scale, so every restaurant feels related.
// Chroma follows the accent, tapered toward the very light and very dark ends.
const STEPS = {
  50: [0.977, 0.07], 100: [0.95, 0.17], 200: [0.906, 0.34], 300: [0.84, 0.6],
  400: [0.764, 0.93], 500: [0.708, 1], 600: [0.59, 0.95], 700: [0.5, 0.86],
  800: [0.409, 0.7], 900: [0.32, 0.56], 950: [0.246, 0.45],
};

// Shared neutrals from globals.css that brand colors must read against
const neutral = (css) => formatHex(parse(css));
const LIGHT = { background: neutral("oklch(98% 0.006 75.4)"), surface: "#ffffff", ink: neutral("oklch(22.6% 0.008 59.2)") };
const DARK = { background: neutral("oklch(22.6% 0.008 59.2)"), surface: neutral("oklch(26.4% 0.012 67.3)") };
const WHITE = "#ffffff";

const MIN_TEXT = 4.5; // WCAG AA, normal text
const MIN_UI = 3; // WCAG AA, focus rings and other non-text UI

const color = (l, c, h) => formatHex(clampChroma({ mode: "oklch", l, c, h }, "oklch"));
const lightnessOf = (hex) => toOklch(hex).l;
const passes = (hex, backgrounds, min) => backgrounds.every((bg) => wcagContrast(hex, bg) >= min);

// Nudge lightness (darker or lighter) until the color passes against every background
function ensureContrast(hex, backgrounds, min, direction) {
  const { c, h } = toOklch(hex);
  let l = lightnessOf(hex);
  let result = hex;
  while (!passes(result, backgrounds, min) && l > 0.05 && l < 0.98) {
    l += direction === "darker" ? -0.01 : 0.01;
    result = color(l, c, h);
  }
  return result;
}

// Dark ink or white, whichever reads better on the fill
const textOn = (fill) => (wcagContrast(LIGHT.ink, fill) >= wcagContrast(WHITE, fill) ? LIGHT.ink : WHITE);

// A fill plus its text color; darkens the fill if neither ink nor white reaches 4.5:1
function fillWithText(hex) {
  let fill = hex;
  const { c, h } = toOklch(hex);
  let l = lightnessOf(hex);
  while (wcagContrast(textOn(fill), fill) < MIN_TEXT && l > 0.3) {
    l -= 0.01;
    fill = color(l, c, h);
  }
  return { fill, text: textOn(fill) };
}

// Hover moves away from the text color, so contrast only improves on hover
const hoverOf = ({ fill, text }) => {
  const { l, c, h } = toOklch(fill);
  return color(text === WHITE ? l - 0.05 : l + 0.05, c, h);
};

export function buildRestaurantTheme(accent) {
  const { l: accentL, c: accentChroma = 0, h = 0 } = toOklch(accent);
  const chroma = Math.min(accentChroma, 0.2); // very neon accents get calmed down
  const scale = Object.fromEntries(
    Object.entries(STEPS).map(([step, [l, taper]]) => [step, color(l, chroma * taper, h)]),
  );

  // Light theme. The main fill is the owner's own color (kept between 35% and 85%
  // lightness so a white or near-black accent still reads as a button).
  const ownColor = color(Math.min(Math.max(accentL, 0.35), 0.85), chroma, h);
  const lightBrand = fillWithText(ownColor);
  const lightTint = scale[50];
  const lightSoft = scale[100];
  const light = {
    brand: lightBrand.fill,
    "brand-hover": hoverOf(lightBrand),
    "on-brand": lightBrand.text,
    "brand-text": ensureContrast(scale[700], [LIGHT.surface, LIGHT.background, lightTint, lightSoft], MIN_TEXT, "darker"),
    "brand-soft": lightSoft,
    "on-brand-soft": ensureContrast(scale[800], [lightSoft], MIN_TEXT, "darker"),
    ring: ensureContrast(lightBrand.fill, [LIGHT.surface, LIGHT.background], MIN_UI, "darker"),
    "surface-tint": lightTint,
  };

  // Dark theme: same hue, tuned for dark surfaces
  const darkBrand = fillWithText(scale[400]);
  const darkTint = color(0.259, Math.min(chroma, 0.024), h);
  const darkSoft = color(0.299, Math.min(chroma, 0.05), h);
  const dark = {
    brand: darkBrand.fill,
    "brand-hover": hoverOf(darkBrand),
    "on-brand": darkBrand.text,
    "brand-text": ensureContrast(scale[300], [DARK.surface, DARK.background, darkTint, darkSoft], MIN_TEXT, "lighter"),
    "brand-soft": darkSoft,
    "on-brand-soft": ensureContrast(scale[200], [darkSoft], MIN_TEXT, "lighter"),
    ring: ensureContrast(scale[400], [DARK.surface, DARK.background], MIN_UI, "lighter"),
    "surface-tint": darkTint,
  };

  return { light, dark };
}

// The theme as CSS variables for an inline style. globals.css picks the light or
// dark set depending on data-theme, so switching themes needs no extra work.
export function themeStyle(theme) {
  const vars = {};
  for (const mode of ["light", "dark"]) {
    for (const [token, value] of Object.entries(theme[mode])) vars[`--r-${token}-${mode}`] = value;
  }
  return vars;
}

// Exposed for the contrast check script
export const CONTRAST_REFERENCE = { LIGHT, DARK, MIN_TEXT, MIN_UI };
