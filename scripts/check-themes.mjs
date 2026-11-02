// Stress-tests the restaurant theme generator: every important color pair must pass
// WCAG AA in both light and dark mode, for real accents, hard accents and random ones.
// Run: npm run check:themes
import { wcagContrast } from "culori";
import { buildRestaurantTheme, CONTRAST_REFERENCE } from "../src/lib/restaurant-theme.js";
import { restaurantAccents } from "./restaurant-accents.mjs";

const { LIGHT, DARK, MIN_TEXT, MIN_UI } = CONTRAST_REFERENCE;

const hard = ["#FFE000", "#111111", "#BDE0FE", "#FF0000", "#00FF00", "#FFFFFF", "#808080", "#7B2CBF"];
const random = Array.from({ length: 50 }, (_, i) => {
  // Deterministic pseudo-random so failures can be reproduced
  const n = (Math.imul(i + 1, 2654435761) >>> 0).toString(16).padStart(8, "0");
  return `#${n.slice(0, 6)}`;
});

function pairs(theme) {
  const l = theme.light;
  const d = theme.dark;
  return [
    ["light brand-text / surface", l["brand-text"], LIGHT.surface, MIN_TEXT],
    ["light brand-text / background", l["brand-text"], LIGHT.background, MIN_TEXT],
    ["light brand-text / surface-tint", l["brand-text"], l["surface-tint"], MIN_TEXT],
    ["light on-brand / brand", l["on-brand"], l.brand, MIN_TEXT],
    ["light on-brand / brand-hover", l["on-brand"], l["brand-hover"], MIN_TEXT],
    ["light on-brand-soft / brand-soft", l["on-brand-soft"], l["brand-soft"], MIN_TEXT],
    ["light ring / background", l.ring, LIGHT.background, MIN_UI],
    ["dark brand-text / surface", d["brand-text"], DARK.surface, MIN_TEXT],
    ["dark brand-text / background", d["brand-text"], DARK.background, MIN_TEXT],
    ["dark brand-text / surface-tint", d["brand-text"], d["surface-tint"], MIN_TEXT],
    ["dark on-brand / brand", d["on-brand"], d.brand, MIN_TEXT],
    ["dark on-brand / brand-hover", d["on-brand"], d["brand-hover"], MIN_TEXT],
    ["dark on-brand-soft / brand-soft", d["on-brand-soft"], d["brand-soft"], MIN_TEXT],
    ["dark ring / background", d.ring, DARK.background, MIN_UI],
  ];
}

let failures = 0;
let worst = Infinity;
for (const [label, accents] of [["restaurants", restaurantAccents], ["hard", hard], ["random", random]]) {
  for (const accent of accents) {
    for (const [name, fg, bg, min] of pairs(buildRestaurantTheme(accent))) {
      const ratio = wcagContrast(fg, bg);
      worst = Math.min(worst, ratio / min);
      if (ratio < min) {
        failures++;
        console.log(`FAIL ${label} ${accent}: ${name} = ${ratio.toFixed(2)} (needs ${min})`);
      }
    }
  }
}

const total = restaurantAccents.length + hard.length + random.length;
console.log(`${total} accents x 14 pairs checked, ${failures} failures, tightest pair at ${worst.toFixed(2)}x the minimum`);
process.exit(failures ? 1 : 0);
