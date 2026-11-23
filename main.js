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

const letterHeight = Object.values(letterData).reduce(
  (acc, rows) => Math.max(acc, rows.length),
  0,
);
// Each terminal row shows two pixel rows, so round the height up to an even number.
const pixelHeight = letterHeight + (letterHeight % 2);
const spaceWidth = 6;

function getGlyph(char) {
  if (char === ' ') {
    return new Array(pixelHeight)
      .fill(null)
      .map(() => new Array(spaceWidth).fill(false));
  }
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
  // Pad to an even width so every terminal cell covers a full 2x2 block.
  if (pixels[0].length % 2) pixels.forEach((row) => row.push(false));
  return pixels;
}

function toBlocks(pixels) {
  const out = [];
  for (let y = 0; y < pixels.length; y += 2) {
    let line = ' '.repeat(offsetLeft);
    for (let x = 0; x < pixels[y].length; x += 2) {
      line += render(
        pixels[y][x],
        pixels[y][x + 1],
        pixels[y + 1][x],
        pixels[y + 1][x + 1],
      );
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
