const sharp = require('sharp');
const path = require('path');

async function resize() {
  const pubDir = path.join(__dirname, '..', 'public');

  await sharp(path.join(pubDir, 'cursor.png'))
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(pubDir, 'cursor-sm.png'));
  console.log('Created cursor-sm.png (32x32)');

  await sharp(path.join(pubDir, 'pointer.png'))
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(pubDir, 'pointer-sm.png'));
  console.log('Created pointer-sm.png (32x32)');
}

resize().catch(console.error);
