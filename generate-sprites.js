// ============================================================
//  DIVA ACADEMY – Sprite Generator
//  Run: node generate-sprites.js
//  Generates all pixel art assets as PNG files
// ============================================================

const fs = require('fs');
const path = require('path');

// ── Minimal PNG writer (no dependencies) ─────────────────────
function createPNG(width, height, pixels) {
  // pixels: array of {r,g,b,a} or null (transparent)
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      const p = pixels[y * width + x];
      if (p) {
        raw.push(p.r, p.g, p.b, p.a !== undefined ? p.a : 255);
      } else {
        raw.push(0, 0, 0, 0);
      }
    }
  }

  const rawBuf = Buffer.from(raw);
  const deflated = deflate(rawBuf);

  // Build PNG
  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT
  chunks.push(makeChunk('IDAT', deflated));

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcBuf);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBytes]);
}

// CRC32
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Minimal DEFLATE (store only - fine for small images)
function deflate(data) {
  // Use stored blocks
  const blocks = [];
  let pos = 0;
  while (pos < data.length) {
    const end = Math.min(pos + 65535, data.length);
    const chunk = data.slice(pos, end);
    const isLast = end >= data.length;
    const header = Buffer.alloc(5);
    header[0] = isLast ? 0x01 : 0x00;
    header.writeUInt16LE(chunk.length, 1);
    header.writeUInt16LE(0xFFFF - chunk.length, 3);
    blocks.push(header, chunk);
    pos = end;
  }
  // Adler32
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((b << 16) | a) >>> 0, 0);
  // zlib header (no compression)
  const zlibHeader = Buffer.from([0x78, 0x01]);
  return Buffer.concat([zlibHeader, ...blocks, adler]);
}

// ── Color helpers ────────────────────────────────────────────
function rgba(r, g, b, a = 255) { return { r, g, b, a }; }
function hex(h, a = 255) {
  const m = h.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? rgba(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), a) : null;
}
const TRANSPARENT = null;

// ── Sprite drawing helpers ───────────────────────────────────
function createCanvas(w, h) {
  return new Array(w * h).fill(null);
}

function setPixel(buf, w, x, y, color) {
  if (x >= 0 && x < w && y >= 0 && y < buf.length / w) {
    buf[y * w + x] = color;
  }
}

function fillRect(buf, w, x, y, rw, rh, color) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(buf, w, x + dx, y + dy, color);
}

function drawSprite(buf, w, ox, oy, spriteData) {
  // spriteData: array of rows, each row is array of colors or null
  for (let y = 0; y < spriteData.length; y++) {
    for (let x = 0; x < spriteData[y].length; x++) {
      if (spriteData[y][x]) setPixel(buf, w, ox + x, oy + y, spriteData[y][x]);
    }
  }
}

// ── PALETTES ─────────────────────────────────────────────────
const PAL = {
  // Player
  skin:     hex('#fde68a'),
  skinShade:hex('#fcd34d'),
  hair:     hex('#7c3aed'),
  hairLight:hex('#a78bfa'),
  dress:    hex('#ec4899'),
  dressDark:hex('#be185d'),
  dressLight:hex('#f472b6'),
  tiara:    hex('#fbbf24'),
  tiaraGem: hex('#ec4899'),
  shoe:     hex('#ec4899'),
  eye:      hex('#1e1b4b'),
  eyeWhite: hex('#ffffff'),
  mouth:    hex('#be185d'),
  cheek:    hex('#fb7185'),

  // Starlet NPC
  starletBody:  hex('#f472b6'),
  starletDark:  hex('#9d174d'),
  // Diva NPC
  divaBody:     hex('#c084fc'),
  divaDark:     hex('#6b21a8'),
  // DJ NPC
  djBody:       hex('#38bdf8'),
  djDark:       hex('#0369a1'),
  djHeadphone:  hex('#333333'),
  // Mother NPC
  motherBody:   hex('#fbbf24'),
  motherDark:   hex('#92400e'),
  motherCrown:  hex('#fbbf24'),

  // Tiles
  wallFace:     hex('#120e20'),
  wallTop:      hex('#2d2048'),
  wallHighlight:hex('#2d2048', 30),
  wallBrick:    hex('#ffffff', 20),
  floorDark:    hex('#1e1838'),
  floorLight:   hex('#231d42'),
  floorLine:    hex('#ffffff', 15),
  carpetDark:   hex('#2a1440'),
  carpetLight:  hex('#351a50'),
  carpetPattern:hex('#f472b6', 40),
  danceDark1:   hex('#2a1060'),
  danceDark2:   hex('#1e0a4a'),
  danceGlow1:   hex('#c084fc', 30),
  danceGlow2:   hex('#f472b6', 30),
  danceGrid:    hex('#ffffff', 35),
  doorFrame:    hex('#3d2060'),
  doorGlow:     hex('#fbbf24', 180),

  // Decor
  plantPot:     hex('#5c3a1a'),
  plantPotTop:  hex('#7c4a2a'),
  plantGreen:   hex('#22c55e'),
  plantGreenD:  hex('#16a34a'),
  plantLeaf:    hex('#4ade80'),
  chandelier:   hex('#fbbf24'),
  chandelierD:  hex('#f59e0b'),
  crystal:      hex('#ffffff', 150),
  bannerPurple: hex('#6b21a8'),
  bannerAccent: hex('#c084fc'),
  bannerGold:   hex('#fbbf24'),
  speakerBody:  hex('#1a1a2e'),
  speakerMid:   hex('#333333'),
  speakerCone:  hex('#555555'),
  speakerInner: hex('#222222'),
  speakerLight: hex('#f472b6'),
  couchBody:    hex('#4a1942'),
  couchCushion:hex('#6b2460'),
  couchArm:     hex('#5a1d50'),
  tableBody:    hex('#5c3a1a'),
  tableTop:     hex('#7c4a2a'),
  tableDrink:   hex('#f472b6'),
  tableIce:     hex('#ffffff'),
  frameGold:    hex('#fbbf24'),
};

// ── PLAYER SPRITE (32x32, 4 frames x 4 directions) ─────────
function generatePlayerSprite() {
  const W = 32, H = 32;
  const FRAME_W = W * 4; // 4 frames
  const DIR_H = H * 4;   // 4 directions
  const buf = createCanvas(FRAME_W, DIR_H);

  const dirs = ['down', 'left', 'right', 'up'];

  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < 4; frame++) {
      const ox = frame * W;
      const oy = dir * H;
      const bob = frame % 2 === 1 ? -1 : 0;
      const walkOffset = [0, 1, -1, 0][frame];

      // Shadow
      fillRect(buf, FRAME_W, ox + 8, oy + 28, 16, 4, rgba(0, 0, 0, 100));

      // Legs
      const legY = oy + 24 + bob;
      if (dir === 0 || dir === 3) { // down/up
        fillRect(buf, FRAME_W, ox + 11 + walkOffset, legY, 4, 6, PAL.skin);
        fillRect(buf, FRAME_W, ox + 17 - walkOffset, legY, 4, 6, PAL.skin);
      } else { // left/right
        fillRect(buf, FRAME_W, ox + 13, legY, 4, 6, PAL.skin);
        fillRect(buf, FRAME_W, ox + 15, legY + (frame % 2) * 2, 4, 6, PAL.skin);
      }

      // Shoes
      fillRect(buf, FRAME_W, ox + 10 + walkOffset, legY + 5, 6, 2, PAL.shoe);
      fillRect(buf, FRAME_W, ox + 16 - walkOffset, legY + 5, 6, 2, PAL.shoe);

      // Dress body
      const bodyY = oy + 14 + bob;
      fillRect(buf, FRAME_W, ox + 10, bodyY, 12, 10, PAL.dress);
      fillRect(buf, FRAME_W, ox + 10, bodyY, 3, 10, PAL.dressDark);
      // Skirt flare
      fillRect(buf, FRAME_W, ox + 8, bodyY + 8, 16, 4, PAL.dress);
      fillRect(buf, FRAME_W, ox + 9, bodyY + 9, 14, 2, PAL.dressLight);

      // Arms
      const armSwing = frame % 2 === 0 ? 0 : 1;
      if (dir === 1) { // left
        fillRect(buf, FRAME_W, ox + 7, bodyY + 1 + armSwing, 3, 8, PAL.skin);
      } else if (dir === 2) { // right
        fillRect(buf, FRAME_W, ox + 22, bodyY + 1 - armSwing, 3, 8, PAL.skin);
      } else {
        fillRect(buf, FRAME_W, ox + 7, bodyY + 1 + armSwing, 3, 8, PAL.skin);
        fillRect(buf, FRAME_W, ox + 22, bodyY + 1 - armSwing, 3, 8, PAL.skin);
      }

      // Head
      const headY = oy + 4 + bob;
      fillRect(buf, FRAME_W, ox + 10, headY, 12, 12, PAL.skin);
      fillRect(buf, FRAME_W, ox + 11, headY + 1, 10, 10, PAL.skinShade);

      // Hair back
      fillRect(buf, FRAME_W, ox + 9, headY - 1, 14, 5, PAL.hair);
      fillRect(buf, FRAME_W, ox + 8, headY + 3, 4, 8, PAL.hair);
      fillRect(buf, FRAME_W, ox + 20, headY + 3, 4, 8, PAL.hair);

      // Face based on direction
      if (dir !== 3) { // not facing up
        // Eyes
        if (dir === 0) { // down
          fillRect(buf, FRAME_W, ox + 12, headY + 5, 2, 3, PAL.eye);
          fillRect(buf, FRAME_W, ox + 18, headY + 5, 2, 3, PAL.eye);
          fillRect(buf, FRAME_W, ox + 12, headY + 5, 1, 1, PAL.eyeWhite);
          fillRect(buf, FRAME_W, ox + 18, headY + 5, 1, 1, PAL.eyeWhite);
        } else if (dir === 1) { // left
          fillRect(buf, FRAME_W, ox + 11, headY + 5, 2, 3, PAL.eye);
          fillRect(buf, FRAME_W, ox + 11, headY + 5, 1, 1, PAL.eyeWhite);
        } else { // right
          fillRect(buf, FRAME_W, ox + 19, headY + 5, 2, 3, PAL.eye);
          fillRect(buf, FRAME_W, ox + 19, headY + 5, 1, 1, PAL.eyeWhite);
        }
        // Cheeks
        fillRect(buf, FRAME_W, ox + 10, headY + 8, 3, 2, PAL.cheek);
        fillRect(buf, FRAME_W, ox + 19, headY + 8, 3, 2, PAL.cheek);
        // Mouth
        fillRect(buf, FRAME_W, ox + 14, headY + 9, 4, 1, PAL.mouth);
      }

      // Hair front
      fillRect(buf, FRAME_W, ox + 10, headY - 1, 12, 3, PAL.hair);
      fillRect(buf, FRAME_W, ox + 11, headY - 1, 4, 2, PAL.hairLight);

      // Tiara
      fillRect(buf, FRAME_W, ox + 11, headY - 3, 10, 2, PAL.tiara);
      fillRect(buf, FRAME_W, ox + 13, headY - 5, 2, 2, PAL.tiara);
      fillRect(buf, FRAME_W, ox + 16, headY - 6, 3, 3, PAL.tiara);
      fillRect(buf, FRAME_W, ox + 20, headY - 5, 2, 2, PAL.tiara);
      setPixel(buf, FRAME_W, ox + 17, headY - 5, PAL.tiaraGem);
    }
  }

  return { width: FRAME_W, height: DIR_H, data: buf };
}

// ── NPC SPRITE (32x32, single frame) ────────────────────────
function generateNPCSprite(bodyColor, darkColor, extras = {}) {
  const W = 32, H = 32;
  const buf = createCanvas(W, H);

  // Shadow
  fillRect(buf, W, 8, 28, 16, 4, rgba(0, 0, 0, 100));

  // Body
  fillRect(buf, W, 10, 16, 12, 10, bodyColor);
  fillRect(buf, W, 10, 16, 3, 10, darkColor);

  // Head
  fillRect(buf, W, 10, 4, 12, 12, PAL.skin);
  fillRect(buf, W, 11, 5, 10, 10, PAL.skinShade);

  // Hair
  fillRect(buf, W, 9, 2, 14, 5, bodyColor);
  fillRect(buf, W, 8, 5, 4, 8, bodyColor);
  fillRect(buf, W, 20, 5, 4, 8, bodyColor);

  // Eyes
  fillRect(buf, W, 12, 9, 2, 3, PAL.eye);
  fillRect(buf, W, 18, 9, 2, 3, PAL.eye);
  fillRect(buf, W, 12, 9, 1, 1, PAL.eyeWhite);
  fillRect(buf, W, 18, 9, 1, 1, PAL.eyeWhite);

  // Cheeks
  fillRect(buf, W, 10, 12, 3, 2, PAL.cheek);
  fillRect(buf, W, 19, 12, 3, 2, PAL.cheek);

  // Mouth
  fillRect(buf, W, 14, 13, 4, 1, PAL.mouth);

  // Hair front
  fillRect(buf, W, 10, 2, 12, 3, bodyColor);

  // Extras by tier
  if (extras.crown) {
    fillRect(buf, W, 11, 0, 10, 2, PAL.tiara);
    fillRect(buf, W, 13, -2, 2, 2, PAL.tiara);
    fillRect(buf, W, 16, -3, 3, 3, PAL.tiara);
    fillRect(buf, W, 20, -2, 2, 2, PAL.tiara);
  }
  if (extras.headphones) {
    fillRect(buf, W, 7, 6, 3, 5, PAL.djHeadphone);
    fillRect(buf, W, 22, 6, 3, 5, PAL.djHeadphone);
    fillRect(buf, W, 9, 3, 14, 2, PAL.djHeadphone);
  }
  if (extras.dress) {
    // Elaborate dress
    fillRect(buf, W, 8, 22, 16, 6, bodyColor);
    fillRect(buf, W, 7, 24, 18, 4, bodyColor);
  }

  // Legs
  fillRect(buf, W, 12, 26, 4, 4, PAL.skin);
  fillRect(buf, W, 16, 26, 4, 4, PAL.skin);

  // Shoes
  fillRect(buf, W, 11, 29, 5, 2, darkColor);
  fillRect(buf, W, 16, 29, 5, 2, darkColor);

  return { width: W, height: H, data: buf };
}

// ── TILESET (32x32 per tile, 8x2 grid = 16 tiles) ──────────
function generateTileset() {
  const TILE = 32;
  const COLS = 8, ROWS = 3;
  const W = TILE * COLS, H = TILE * ROWS;
  const buf = createCanvas(W, H);

  // Tile 0: Floor
  fillRect(buf, W, 0, 0, TILE, TILE, PAL.floorDark);
  fillRect(buf, W, 1, 1, TILE - 2, TILE - 2, PAL.floorLight);
  fillRect(buf, W, 0, 0, TILE, 1, PAL.floorLine);
  fillRect(buf, W, 0, 0, 1, TILE, PAL.floorLine);

  // Tile 1: Wall (with 3D depth)
  const wallOx = TILE;
  fillRect(buf, W, wallOx, 0, TILE, TILE, PAL.wallFace);
  fillRect(buf, W, wallOx, 0, TILE, TILE - 8, PAL.wallTop);
  fillRect(buf, W, wallOx, 0, TILE, 1, PAL.wallHighlight);
  fillRect(buf, W, wallOx, TILE - 8, TILE, 8, PAL.wallFace);
  // Brick lines
  fillRect(buf, W, wallOx, TILE - 8 + 3, TILE, 1, PAL.wallBrick);
  fillRect(buf, W, wallOx, TILE - 8 + 6, TILE, 1, PAL.wallBrick);
  fillRect(buf, W, wallOx + TILE / 2, TILE - 8, 1, 3, PAL.wallBrick);
  fillRect(buf, W, wallOx + TILE / 4, TILE - 5, 1, 3, PAL.wallBrick);
  fillRect(buf, W, wallOx + TILE * 3 / 4, TILE - 5, 1, 3, PAL.wallBrick);

  // Tile 2: Carpet
  const carpetOx = TILE * 2;
  fillRect(buf, W, carpetOx, 0, TILE, TILE, PAL.carpetDark);
  fillRect(buf, W, carpetOx + 3, 3, TILE - 6, TILE - 6, PAL.carpetLight);
  fillRect(buf, W, carpetOx + TILE / 2 - 3, TILE / 2 - 3, 6, 6, PAL.carpetPattern);

  // Tile 3: Dancefloor
  const danceOx = TILE * 3;
  fillRect(buf, W, danceOx, 0, TILE, TILE, PAL.danceDark1);
  fillRect(buf, W, danceOx + 2, 2, TILE - 4, TILE - 4, PAL.danceGlow1);
  fillRect(buf, W, danceOx, 0, 1, TILE, PAL.danceGrid);
  fillRect(buf, W, danceOx, 0, TILE, 1, PAL.danceGrid);

  // Tile 4: Door
  const doorOx = TILE * 4;
  fillRect(buf, W, doorOx, 0, TILE, TILE, PAL.floorDark);
  fillRect(buf, W, doorOx + 4, 4, TILE - 8, TILE - 8, PAL.doorFrame);
  fillRect(buf, W, doorOx + TILE / 2 - 3, TILE / 2 - 2, 6, 3, PAL.doorGlow);
  fillRect(buf, W, doorOx + TILE / 2 - 1, TILE / 2 + 1, 4, 3, PAL.doorGlow);

  // Tile 5: Wall top (walkable below)
  const wallTopOx = TILE * 5;
  fillRect(buf, W, wallTopOx, 0, TILE, TILE, PAL.floorDark);
  fillRect(buf, W, wallTopOx, 0, TILE, TILE / 2, PAL.wallTop);

  // Tile 6: Alt floor
  const altFloorOx = TILE * 6;
  fillRect(buf, W, altFloorOx, 0, TILE, TILE, hex('#1a1430'));
  fillRect(buf, W, altFloorOx + 1, 1, TILE - 2, TILE - 2, hex('#1e1838'));

  // Tile 7: Highlight floor
  const hiFloorOx = TILE * 7;
  fillRect(buf, W, hiFloorOx, 0, TILE, TILE, hex('#231d42'));
  fillRect(buf, W, hiFloorOx + 1, 1, TILE - 2, TILE - 2, hex('#2a2050'));

  // Row 2: More variants
  // Tile 8: Carpet dark
  fillRect(buf, W, 0, TILE, TILE, TILE, hex('#200e35'));
  fillRect(buf, W, 3, TILE + 3, TILE - 6, TILE - 6, hex('#2a1440'));

  // Tile 9: Dancefloor alt
  fillRect(buf, W, TILE, TILE, TILE, TILE, PAL.danceDark2);
  fillRect(buf, W, TILE + 2, TILE + 2, TILE - 4, TILE - 4, PAL.danceGlow2);

  // Tiles 10-15: Fill with variations
  for (let i = 2; i < 8; i++) {
    const ox = TILE * i;
    fillRect(buf, W, ox, TILE, TILE, TILE, PAL.floorDark);
    fillRect(buf, W, ox + 1, TILE + 1, TILE - 2, TILE - 2, PAL.floorLight);
  }

  // Row 3: Wall variants
  for (let i = 0; i < 8; i++) {
    const ox = TILE * i;
    fillRect(buf, W, ox, TILE * 2, TILE, TILE, PAL.wallFace);
    fillRect(buf, W, ox, TILE * 2, TILE, TILE - 8, PAL.wallTop);
    fillRect(buf, W, ox, TILE * 2 + TILE - 8, TILE, 8, PAL.wallFace);
  }

  return { width: W, height: H, data: buf };
}

// ── DECOR SPRITES (32x32 each) ──────────────────────────────
function generateDecorSprites() {
  const W = 32, H = 32;
  const sprites = {};

  // Plant
  const plant = createCanvas(W, H);
  fillRect(plant, W, 13, 24, 6, 8, PAL.plantPot);
  fillRect(plant, W, 11, 22, 10, 3, PAL.plantPotTop);
  fillRect(plant, W, 10, 10, 12, 13, PAL.plantGreen);
  fillRect(plant, W, 12, 6, 8, 8, PAL.plantGreenD);
  fillRect(plant, W, 14, 8, 4, 4, PAL.plantLeaf);
  sprites.plant = { width: W, height: H, data: plant };

  // Chandelier
  const chandelier = createCanvas(W, H);
  fillRect(chandelier, W, 10, 4, 12, 4, PAL.chandelier);
  fillRect(chandelier, W, 12, 8, 8, 3, PAL.chandelierD);
  for (let i = 0; i < 4; i++) {
    fillRect(chandelier, W, 11 + i * 3, 11, 2, 5, PAL.crystal);
  }
  sprites.chandelier = { width: W, height: H, data: chandelier };

  // Banner
  const banner = createCanvas(W, H);
  fillRect(banner, W, 12, 4, 8, 24, PAL.bannerPurple);
  fillRect(banner, W, 13, 7, 6, 3, PAL.bannerAccent);
  fillRect(banner, W, 13, 16, 6, 2, PAL.bannerGold);
  sprites.banner = { width: W, height: H, data: banner };

  // Speaker
  const speaker = createCanvas(W, H);
  fillRect(speaker, W, 10, 8, 12, 24, PAL.speakerBody);
  fillRect(speaker, W, 11, 10, 10, 20, PAL.speakerMid);
  fillRect(speaker, W, 12, 12, 8, 8, PAL.speakerCone);
  fillRect(speaker, W, 13, 14, 6, 4, PAL.speakerInner);
  fillRect(speaker, W, 14, 24, 4, 2, PAL.speakerLight);
  sprites.speaker = { width: W, height: H, data: speaker };

  // Spotlight
  const spotlight = createCanvas(W, H);
  fillRect(spotlight, W, 14, 16, 4, 16, hex('#444444'));
  fillRect(spotlight, W, 10, 8, 12, 10, hex('#666666'));
  fillRect(spotlight, W, 8, 0, 16, 10, rgba(251, 191, 36, 40));
  sprites.spotlight = { width: W, height: H, data: spotlight };

  // Couch
  const couch = createCanvas(W, H);
  fillRect(couch, W, 4, 18, 24, 14, PAL.couchBody);
  fillRect(couch, W, 6, 20, 20, 10, PAL.couchCushion);
  fillRect(couch, W, 4, 16, 6, 16, PAL.couchArm);
  fillRect(couch, W, 22, 16, 6, 16, PAL.couchArm);
  sprites.couch = { width: W, height: H, data: couch };

  // Table
  const table = createCanvas(W, H);
  fillRect(table, W, 8, 20, 16, 12, PAL.tableBody);
  fillRect(table, W, 8, 18, 16, 3, PAL.tableTop);
  fillRect(table, W, 14, 14, 4, 5, PAL.tableDrink);
  fillRect(table, W, 15, 15, 2, 2, PAL.tableIce);
  sprites.table = { width: W, height: H, data: table };

  // Painting
  const painting = createCanvas(W, H);
  fillRect(painting, W, 8, 6, 16, 18, PAL.frameGold);
  const hue1 = hex('#4a1942');
  const hue2 = hex('#1a4a4a');
  const hue3 = hex('#4a1a1a');
  fillRect(painting, W, 10, 8, 12, 14, hue1);
  fillRect(painting, W, 12, 10, 5, 5, hue2);
  fillRect(painting, W, 18, 12, 3, 6, hue3);
  sprites.painting = { width: W, height: H, data: painting };

  // Lamp
  const lamp = createCanvas(W, H);
  fillRect(lamp, W, 14, 18, 4, 14, hex('#444444'));
  fillRect(lamp, W, 10, 8, 12, 11, PAL.chandelier);
  fillRect(lamp, W, 4, 0, 24, 12, rgba(251, 191, 36, 25));
  sprites.lamp = { width: W, height: H, data: lamp };

  return sprites;
}

// ── UI ELEMENTS ──────────────────────────────────────────────
function generateUIElements() {
  const sprites = {};

  // Dialogue box (256x64)
  const dw = 256, dh = 64;
  const dbox = createCanvas(dw, dh);
  fillRect(dbox, dw, 0, 0, dw, dh, hex('#14142a', 230));
  fillRect(dbox, dw, 1, 1, dw - 2, dh - 2, hex('#1c1c3a', 200));
  // Border glow
  for (let x = 2; x < dw - 2; x++) {
    setPixel(dbox, dw, x, 0, rgba(192, 132, 252, 60));
    setPixel(dbox, dw, x, dh - 1, rgba(192, 132, 252, 30));
  }
  for (let y = 2; y < dh - 2; y++) {
    setPixel(dbox, dw, 0, y, rgba(192, 132, 252, 40));
    setPixel(dbox, dw, dw - 1, y, rgba(192, 132, 252, 40));
  }
  sprites.dialogueBox = { width: dw, height: dh, data: dbox };

  // Face-Off frame (256x128)
  const bw = 256, bh = 128;
  const bframe = createCanvas(bw, bh);
  fillRect(bframe, bw, 0, 0, bw, bh, hex('#0a0a12', 240));
  // Gradient border
  for (let x = 0; x < bw; x++) {
    const t = x / bw;
    const r = Math.floor(192 + (244 - 192) * t);
    const g = Math.floor(132 + (114 - 132) * t);
    const b = Math.floor(252 + (182 - 252) * t);
    setPixel(bframe, bw, x, 0, rgba(r, g, b, 180));
    setPixel(bframe, bw, x, 1, rgba(r, g, b, 100));
  }
  sprites.faceoffFrame = { width: bw, height: bh, data: bframe };

  return sprites;
}

// ── MAIN ─────────────────────────────────────────────────────
function main() {
  const outDir = path.join(__dirname, 'assets');
  const spritesDir = path.join(outDir, 'sprites');
  const tilesDir = path.join(outDir, 'tiles');

  // Ensure directories exist
  [spritesDir, tilesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  console.log('Generating player sprite sheet...');
  const player = generatePlayerSprite();
  fs.writeFileSync(path.join(spritesDir, 'player.png'), createPNG(player.width, player.height, player.data));
  console.log(`  -> player.png (${player.width}x${player.height})`);

  console.log('Generating NPC sprites...');
  const npcs = [
    { name: 'npc-starlet', color: PAL.starletBody, dark: PAL.starletDark, extras: {} },
    { name: 'npc-diva', color: PAL.divaBody, dark: PAL.divaDark, extras: { dress: true } },
    { name: 'npc-dj', color: PAL.djBody, dark: PAL.djDark, extras: { headphones: true } },
    { name: 'npc-mother', color: PAL.motherBody, dark: PAL.motherDark, extras: { crown: true, dress: true } },
  ];

  for (const npc of npcs) {
    const sprite = generateNPCSprite(npc.color, npc.dark, npc.extras);
    fs.writeFileSync(path.join(spritesDir, `${npc.name}.png`), createPNG(sprite.width, sprite.height, sprite.data));
    console.log(`  -> ${npc.name}.png (${sprite.width}x${sprite.height})`);
  }

  console.log('Generating tileset...');
  const tileset = generateTileset();
  fs.writeFileSync(path.join(tilesDir, 'indoor.png'), createPNG(tileset.width, tileset.height, tileset.data));
  console.log(`  -> indoor.png (${tileset.width}x${tileset.height})`);

  console.log('Generating decor sprites...');
  const decor = generateDecorSprites();
  for (const [name, sprite] of Object.entries(decor)) {
    fs.writeFileSync(path.join(spritesDir, `decor-${name}.png`), createPNG(sprite.width, sprite.height, sprite.data));
    console.log(`  -> decor-${name}.png (${sprite.width}x${sprite.height})`);
  }

  console.log('Generating UI elements...');
  const ui = generateUIElements();
  for (const [name, sprite] of Object.entries(ui)) {
    fs.writeFileSync(path.join(spritesDir, `ui-${name}.png`), createPNG(sprite.width, sprite.height, sprite.data));
    console.log(`  -> ui-${name}.png (${sprite.width}x${sprite.height})`);
  }

  console.log('\nAll sprites generated successfully!');
  console.log('Assets saved to: assets/sprites/ and assets/tiles/');
}

main();
