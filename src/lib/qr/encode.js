// A QR code encoder, written from the standard (ISO/IEC 18004). Plain functions, with
// no dependencies, so the server and the browser can share it.
//
// The steps, in order:
//   1. Turn the text into bits: a mode, a length, the bytes, then padding.
//   2. Split those into blocks and add Reed-Solomon error correction to each, so a
//      scratched or dirty code can still be read.
//   3. Draw the fixed patterns that help a camera find and read the code.
//   4. Lay the data bits into the rest of the grid in a zigzag.
//   5. Try all eight masks, which flip bits in a pattern, and keep the one that leaves
//      the code easiest to scan.
//
// Only what restaurant links need: byte mode, error correction level M (about 15% of
// the code can be damaged), and versions 1 to 10, which hold up to 213 bytes.

// [error correction codewords per block, groups of [block count, data codewords each]]
const VERSIONS_M = [
  null,
  [10, [[1, 16]]],
  [16, [[1, 28]]],
  [26, [[1, 44]]],
  [18, [[2, 32]]],
  [24, [[2, 43]]],
  [16, [[4, 27]]],
  [18, [[4, 31]]],
  [22, [[2, 38], [2, 39]]],
  [22, [[3, 36], [2, 37]]],
  [26, [[4, 43], [1, 44]]],
];

// Where the small alignment squares go, by version
const ALIGNMENT = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

const FORMAT_LEVEL_M = 0b00;
const MODE_BYTE = 0b0100;

// ---- Arithmetic in GF(256), the field Reed-Solomon works in

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = x << 1;
  // The standard's field polynomial: x^8 + x^4 + x^3 + x^2 + 1
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

const multiply = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

// The generator polynomial for a number of error correction codewords
function generator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    poly.forEach((coefficient, j) => {
      next[j] ^= coefficient;
      next[j + 1] ^= multiply(coefficient, EXP[i]);
    });
    poly = next;
  }
  return poly;
}

// The remainder of dividing the data by the generator is the error correction
export function reedSolomon(data, degree) {
  const poly = generator(degree);
  const remainder = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i++) remainder[i] ^= multiply(poly[i + 1], factor);
  }
  return remainder;
}

// ---- Step 1: bits

const dataCapacity = (version) => VERSIONS_M[version][1].reduce((sum, [count, size]) => sum + count * size, 0);
const lengthBits = (version) => (version < 10 ? 8 : 16);

function pickVersion(byteCount) {
  for (let version = 1; version < VERSIONS_M.length; version++) {
    // Mode (4 bits) + length + the bytes must fit
    if (4 + lengthBits(version) + byteCount * 8 <= dataCapacity(version) * 8) return version;
  }
  throw new RangeError(`Too long for a QR code: ${byteCount} bytes`);
}

function dataCodewords(bytes, version) {
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(MODE_BYTE, 4);
  push(bytes.length, lengthBits(version));
  for (const byte of bytes) push(byte, 8);

  const capacity = dataCapacity(version) * 8;
  push(0, Math.min(4, capacity - bits.length)); // the terminator
  push(0, -bits.length & 7); // up to a whole byte

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  // Fill the rest with the two pad bytes the standard names
  for (let pad = 0xec; codewords.length < capacity / 8; pad ^= 0xec ^ 0x11) codewords.push(pad);
  return codewords;
}

// ---- Step 2: blocks, error correction, and interleaving

function withErrorCorrection(codewords, version) {
  const [degree, groups] = VERSIONS_M[version];
  const blocks = [];
  let at = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) {
      const data = codewords.slice(at, at + size);
      at += size;
      blocks.push({ data, correction: reedSolomon(data, degree) });
    }
  }
  // One byte from each block in turn, so damage in one spot hurts every block a little
  const result = [];
  const longest = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < longest; i++) {
    for (const block of blocks) if (i < block.data.length) result.push(block.data[i]);
  }
  for (let i = 0; i < degree; i++) {
    for (const block of blocks) result.push(block.correction[i]);
  }
  return result;
}

// ---- Step 3: the fixed patterns

function createGrid(size) {
  return {
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(false)),
    // Cells that aren't data: the masks and the zigzag leave them alone
    reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function setFunction(grid, row, column, dark) {
  grid.modules[row][column] = dark;
  grid.reserved[row][column] = true;
}

function drawFinder(grid, row, column) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = row + r;
      const x = column + c;
      if (y < 0 || x < 0 || y >= grid.size || x >= grid.size) continue;
      const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
      // A solid square, a light ring, a dark ring, and a light separator
      setFunction(grid, y, x, ring !== 2 && ring !== 4);
    }
  }
}

function drawFixedPatterns(grid, version) {
  const { size } = grid;
  drawFinder(grid, 0, 0);
  drawFinder(grid, 0, size - 7);
  drawFinder(grid, size - 7, 0);

  for (const row of ALIGNMENT[version]) {
    for (const column of ALIGNMENT[version]) {
      if (grid.reserved[row][column]) continue; // overlaps a finder
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) setFunction(grid, row + r, column + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
    }
  }

  // The dotted timing lines, which tell a reader the size of a module
  for (let i = 8; i < size - 8; i++) {
    setFunction(grid, 6, i, i % 2 === 0);
    setFunction(grid, i, 6, i % 2 === 0);
  }

  // Held for the format information, which depends on the mask
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      grid.reserved[8][i] = true;
      grid.reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    grid.reserved[8][size - 1 - i] = true;
    grid.reserved[size - 1 - i][8] = true;
  }
  setFunction(grid, size - 8, 8, true); // the one module that's always dark

  if (version >= 7) drawVersionInfo(grid, version);
}

// The remainder of a BCH code, which protects these two small pieces of information
function bch(value, generatorPoly, generatorBits, dataBits) {
  let remainder = value << (generatorBits - 1);
  for (let i = generatorBits + dataBits - 2; i >= generatorBits - 1; i--) {
    if ((remainder >>> i) & 1) remainder ^= generatorPoly << (i - generatorBits + 1);
  }
  return (value << (generatorBits - 1)) | remainder;
}

function drawVersionInfo(grid, version) {
  const bits = bch(version, 0x1f25, 13, 6);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = (i % 3) + grid.size - 11;
    setFunction(grid, a, b, dark);
    setFunction(grid, b, a, dark);
  }
}

function drawFormatInfo(grid, mask) {
  const { size } = grid;
  // XORed with a fixed pattern so the format bits are never all light
  const bits = bch((FORMAT_LEVEL_M << 3) | mask, 0x537, 11, 5) ^ 0x5412;
  const bit = (i) => ((bits >>> i) & 1) === 1;

  for (let i = 0; i <= 5; i++) setFunction(grid, i, 8, bit(i));
  setFunction(grid, 7, 8, bit(6));
  setFunction(grid, 8, 8, bit(7));
  setFunction(grid, 8, 7, bit(8));
  for (let i = 9; i < 15; i++) setFunction(grid, 8, 14 - i, bit(i));

  for (let i = 0; i < 8; i++) setFunction(grid, 8, size - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) setFunction(grid, size - 15 + i, 8, bit(i));
}

// ---- Step 4: the zigzag

function drawData(grid, codewords) {
  const { size, modules, reserved } = grid;
  let index = 0;
  // Two columns at a time from the right edge, up and then down. Column 6 is timing.
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const column of [right, right - 1]) {
        if (reserved[row][column]) continue;
        // Bits left over after the last codeword stay light
        modules[row][column] = index < codewords.length * 8 && ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
        index++;
      }
    }
  }
}

// ---- Step 5: masks

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
];

function applyMask(grid, mask) {
  const flip = MASKS[mask];
  for (let row = 0; row < grid.size; row++) {
    for (let column = 0; column < grid.size; column++) {
      if (!grid.reserved[row][column] && flip(row, column)) grid.modules[row][column] = !grid.modules[row][column];
    }
  }
}

// What makes a code hard to scan, scored as the standard defines it. Lower is better.
export function penalty(modules) {
  const size = modules.length;
  let score = 0;
  const lines = [...modules, ...modules[0].map((_, column) => modules.map((row) => row[column]))];

  // Rule 1: long runs of one color
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) {
        run++;
      } else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
  }

  // Rule 2: 2x2 squares of one color
  for (let row = 0; row < size - 1; row++) {
    for (let column = 0; column < size - 1; column++) {
      const color = modules[row][column];
      if (color === modules[row][column + 1] && color === modules[row + 1][column] && color === modules[row + 1][column + 1]) score += 3;
    }
  }

  // Rule 3: anything that looks like a finder pattern
  const finderLike = "10111010000";
  const finderLikeReversed = "00001011101";
  for (const line of lines) {
    const text = line.map((dark) => (dark ? "1" : "0")).join("");
    for (let i = 0; i + 11 <= text.length; i++) {
      const part = text.slice(i, i + 11);
      if (part === finderLike || part === finderLikeReversed) score += 40;
    }
  }

  // Rule 4: too far from half dark
  const dark = modules.flat().filter(Boolean).length;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

// The grid for a text: rows of booleans, true for dark, without the quiet zone
export function encodeQr(text) {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const size = version * 4 + 17;
  const codewords = withErrorCorrection(dataCodewords(bytes, version), version);

  const grid = createGrid(size);
  drawFixedPatterns(grid, version);
  drawData(grid, codewords);

  let best = null;
  for (let mask = 0; mask < MASKS.length; mask++) {
    applyMask(grid, mask);
    drawFormatInfo(grid, mask);
    const score = penalty(grid.modules);
    if (!best || score < best.score) best = { score, mask, modules: grid.modules.map((row) => [...row]) };
    applyMask(grid, mask); // masks undo themselves
  }
  return { modules: best.modules, version, mask: best.mask, size };
}
