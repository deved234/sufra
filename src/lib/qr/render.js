// Drawing a QR grid. The standard asks for a light margin of four modules around it.
export const QUIET_ZONE = 4;

export const viewSize = (modules) => modules.length + QUIET_ZONE * 2;

// One SVG path for all the dark modules, as horizontal runs, which keeps it small and
// leaves no hairline gaps between neighbors when printed
export function qrPath(modules) {
  const parts = [];
  modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      const start = x;
      while (x + 1 < row.length && row[x + 1]) x++;
      parts.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${x - start + 1}v1h-${x - start + 1}z`);
    }
  });
  return parts.join("");
}

export function qrSvg(modules, color) {
  const view = viewSize(modules);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" shape-rendering="crispEdges"><rect width="${view}" height="${view}" fill="#ffffff"/><path fill="${color}" d="${qrPath(modules)}"/></svg>`;
}

// WCAG's relative luminance of a #RRGGBB color
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// The restaurant's color only when a camera can tell it from white. Being read matters
// more than matching: scanners want strong contrast, so this asks for more than text does.
export function qrColor(accent) {
  const contrast = 1.05 / (luminance(accent) + 0.05);
  return contrast >= 7 ? accent : "#111111";
}
