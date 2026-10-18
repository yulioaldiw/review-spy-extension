// Script to generate valid solid/gradient PNG icons without external dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size, outPath) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8);       // bit depth
  ihdr.writeUInt8(6, 9);       // color type RGBA
  ihdr.writeUInt8(0, 10);      // compression
  ihdr.writeUInt8(0, 11);      // filter
  ihdr.writeUInt8(0, 12);      // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 per line
  // Brand color: Indigo #6366F1 -> R:99, G:102, B:241 with a soft rounded look
  const rawData = [];
  const radius = size / 2;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte none
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Rounded icon badge
      if (dist < radius - 0.5) {
        // Gradient from Indigo (99, 102, 241) to Purple (168, 85, 247)
        const ratio = (x + y) / (size * 2);
        const r = Math.round(99 + ratio * (168 - 99));
        const g = Math.round(102 + ratio * (85 - 102));
        const b = Math.round(241 + ratio * (247 - 241));
        rawData.push(r, g, b, 255);
      } else if (dist < radius + 0.5) {
        // Simple anti-aliasing edge
        const alpha = Math.round(255 * (radius + 0.5 - dist));
        rawData.push(99, 102, 241, alpha);
      } else {
        rawData.push(0, 0, 0, 0); // transparent
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outPath, pngBuffer);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach(size => {
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  generatePng(size, filePath);
  console.log(`Generated: ${filePath}`);
});
