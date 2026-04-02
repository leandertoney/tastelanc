const fs = require('fs');
const path = require('path');

// Minimal valid PNG data (1x1 transparent pixel)
// PNG header + IHDR chunk + IDAT chunk (compressed transparent pixel) + IEND chunk
const createPNG = (width, height, r, g, b) => {
  // For simplicity, create a minimal 1x1 PNG
  // In production, use a proper image library
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);  // width
  ihdrData.writeUInt32BE(1, 4);  // height
  ihdrData.writeUInt8(8, 8);     // bit depth
  ihdrData.writeUInt8(2, 9);     // color type (RGB)
  ihdrData.writeUInt8(0, 10);    // compression
  ihdrData.writeUInt8(0, 11);    // filter
  ihdrData.writeUInt8(0, 12);    // interlace

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.alloc(12 + 13);
  ihdr.writeUInt32BE(13, 0);  // length
  ihdr.write('IHDR', 4);
  ihdrData.copy(ihdr, 8);
  ihdr.writeInt32BE(ihdrCrc, 21);

  // IDAT chunk (minimal compressed data for 1x1 RGB pixel)
  const zlib = require('zlib');
  const rawData = Buffer.from([0, r, g, b]);  // filter byte + RGB
  const compressed = zlib.deflateSync(rawData);

  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idat = Buffer.alloc(12 + compressed.length);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  idat.writeInt32BE(idatCrc, 8 + compressed.length);

  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]);
  iend.writeInt32BE(iendCrc, 8);

  return Buffer.concat([pngSignature, ihdr, idat, iend]);
};

// CRC32 implementation for PNG
const crc32Table = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Create icon.png (1024x1024 ideally, but 1x1 for now)
const iconPng = createPNG(1, 1, 233, 30, 99);  // Pink color (#E91E63)
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconPng);
console.log('Created icon.png');

// Create adaptive-icon.png
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), iconPng);
console.log('Created adaptive-icon.png');

// Create splash-icon.png
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), iconPng);
console.log('Created splash-icon.png');

// Create favicon.png
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), iconPng);
console.log('Created favicon.png');

console.log('All assets created successfully!');
