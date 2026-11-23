import { readFileSync, readdirSync } from 'node:fs';

const input = readFileSync('./input.txt', 'utf8')
  .trim()
  .replace(/\r/g, '')
  .split('\n')
  // Split by code point, so characters outside the BMP stay whole.
  .map((line) => [...line]);

// Left margin, in terminal cells.
const offsetLeft = 1;
// Gap between letters, in terminal cells.
const letterGap = 1;
// Output mode: quadrants (2x2 pixels per cell) by default, `--sextants` for 2x3 pixels per cell.
const useSextants = process.argv.includes('--sextants');
// Pixel rows covered by one terminal row.
const cellHeight = useSextants ? 3 : 2;

const letterData = {};

// Letter files are named after the character's code point in hex, e.g. `4c.txt` for "L".
readdirSync('./letters').forEach((file) => {
  const name = file.split('.')[0];
  if (!/^[0-9a-f]+$/i.test(name)) {
    console.error(
      `Skipping "${file}": file name is not a hexadecimal character code.`,
    );
    return;
  }
  const letter = String.fromCodePoint(parseInt(name, 16));
  const content = readFileSync(`./letters/${file}`, 'utf8')
    .replace(/\r/g, '')
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => line.split(''));
  const longest = content.reduce((acc, line) => Math.max(acc, line.length), 0);
  letterData[letter] = content.map((line) => {
    const newLine = new Array(longest).fill(false);
    line.forEach((char, index) => {
      newLine[index] = char == '#';
    });
    return newLine;
  });
});

function render(tl, tr, bl, br) {
  const id = tl * 8 + tr * 4 + bl * 2 + br;

  switch (id) {
    case 0:
      return ' ';
    case 1:
      return '▗';
    case 2:
      return '▖';
    case 3:
      return '▄';
    case 4:
      return '▝';
    case 5:
      return '▐';
    case 6:
      return '▞';
    case 7:
      return '▟';
    case 8:
      return '▘';
    case 9:
      return '▚';
    case 10:
      return '▌';
    case 11:
      return '▙';
    case 12:
      return '▀';
    case 13:
      return '▜';
    case 14:
      return '▛';
    case 15:
      return '█';
  }
}

// Sextant characters U+1FB00-1FB3B. Pixels are numbered 1-6 left to right, top to bottom,
// and pixel n sets bit n-1. The block skips the patterns that already exist elsewhere:
// empty, full, left half and right half.
function renderSextant(bits) {
  switch (bits) {
    case 0:
      return ' ';
    case 0b010101:
      return '▌';
    case 0b101010:
      return '▐';
    case 0b111111:
      return '█';
  }
  let index = bits - 1;
  if (bits > 0b010101) index--;
  if (bits > 0b101010) index--;
  return String.fromCodePoint(0x1fb00 + index);
}

const letterHeight = Object.values(letterData).reduce(
  (acc, rows) => Math.max(acc, rows.length),
  0,
);
// Round the height up to a whole number of terminal rows.
const pixelHeight = Math.ceil(letterHeight / cellHeight) * cellHeight;
const spaceWidth = 6;

function getGlyph(char) {
  const glyph =
    letterData[char] ??
    letterData[char.toUpperCase()] ??
    letterData[char.toLowerCase()];
  if (!glyph) {
    return getGlyph(' ');
  }
  return glyph;
}

// Build the pixel grid for one input line: glyphs side by side, `letterGap` cells between them.
function buildPixels(chars) {
  const pixels = new Array(pixelHeight).fill(null).map(() => []);
  chars.forEach((char, index) => {
    const glyph = getGlyph(char);
    const width = glyph[0]?.length ?? 0;
    for (let y = 0; y < pixelHeight; y++) {
      if (index > 0) pixels[y].push(...new Array(letterGap * 2).fill(false));
      // Shorter glyphs are aligned to the bottom (baseline).
      const row = glyph[y - (pixelHeight - glyph.length)];
      for (let x = 0; x < width; x++) pixels[y].push(row?.[x] ?? false);
    }
  });
  // Pad to an even width so every terminal cell covers a full block.
  if (pixels[0].length % 2) pixels.forEach((row) => row.push(false));
  return pixels;
}

function toBlocks(pixels) {
  const out = [];
  for (let y = 0; y < pixels.length; y += cellHeight) {
    let line = ' '.repeat(offsetLeft);
    for (let x = 0; x < pixels[y].length; x += 2) {
      if (useSextants) {
        let bits = 0;
        for (let dy = 0; dy < 3; dy++) {
          if (pixels[y + dy][x]) bits |= 1 << (dy * 2);
          if (pixels[y + dy][x + 1]) bits |= 1 << (dy * 2 + 1);
        }
        line += renderSextant(bits);
      } else {
        line += render(
          pixels[y][x],
          pixels[y][x + 1],
          pixels[y + 1][x],
          pixels[y + 1][x + 1],
        );
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

const lines = [];
input.forEach((chars, index) => {
  if (index > 0) lines.push('');
  lines.push(...toBlocks(buildPixels(chars)));
});

console.log(lines.join('\n'));
