// Checks the hand-written encoder with jsQR, a decoder that shares none of its code
import { strict as assert } from "node:assert";
import { test } from "node:test";
import jsQR from "jsqr";
import { encodeQr, reedSolomon } from "@/lib/qr/encode";
import { QUIET_ZONE, qrSvg, viewSize } from "@/lib/qr/render";

function decode(modules, scale = 4) {
  const pixels = viewSize(modules) * scale;
  const data = new Uint8ClampedArray(pixels * pixels * 4).fill(255);
  for (let y = 0; y < modules.length; y++) {
    for (let x = 0; x < modules.length; x++) {
      if (!modules[y][x]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const at = ((y + QUIET_ZONE) * scale + dy) * pixels + ((x + QUIET_ZONE) * scale + dx);
          data[at * 4] = data[at * 4 + 1] = data[at * 4 + 2] = 0;
        }
      }
    }
  }
  return jsQR(data, pixels, pixels);
}

function assertDecodes(text) {
  const { modules, version, size } = encodeQr(text);
  assert.equal(modules.length, size);
  assert.equal(size, version * 4 + 17);
  const result = decode(modules);
  assert.equal(result?.data, text);
  assert.equal(result.version, version);
}

test("Reed-Solomon matches the standard's worked example", () => {
  const data = [0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11];
  assert.deepEqual([...reedSolomon(data, 10)], [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55]);
});

test("real links and Arabic text decode", () => {
  for (const text of [
    "https://sufra-sandy.vercel.app/r/bahr-jeddah",
    "https://sufra-sandy.vercel.app/en/r/bahr-jeddah",
    "https://sufra-sandy.vercel.app/r/a",
    "https://sufra-sandy.vercel.app/r/a-very-long-restaurant-address-with-many-many-words-in-it",
    "http://localhost:3000/r/x",
    "مطعم سفرة، رابط بالعربي",
  ]) {
    assertDecodes(text);
  }
});

test("every length through every version decodes, up to the limit", () => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-/:.?=&";
  let seed = 7;
  const random = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
  const masks = new Set();
  for (let length = 1; length <= 213; length++) {
    const text = Array.from({ length }, () => alphabet[random(alphabet.length)]).join("");
    masks.add(encodeQr(text).mask);
    assertDecodes(text);
  }
  assert.ok(masks.size > 1, "more than one mask gets chosen");
});

test("text too long for the largest size is refused", () => {
  assert.throws(() => encodeQr("x".repeat(214)));
});

test("the SVG is drawn in the color asked for", () => {
  assert.match(qrSvg(encodeQr("https://sufra-sandy.vercel.app/r/x").modules, "#111111"), /#111111/);
});
