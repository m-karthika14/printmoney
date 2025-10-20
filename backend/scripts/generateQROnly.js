const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node generateQROnly.js <shopId>');
    process.exit(1);
  }
  const folderPath = path.join(__dirname, '..', 'uploads', 'qrcodes');
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  const filePath = path.join(folderPath, `${shopId}.png`);
  const qrLink = `https://www.eazeprint.com/app?shop=${encodeURIComponent(shopId)}`;
  try {
    await QRCode.toFile(filePath, qrLink, { width: 300 });
    console.log('QR generated at', filePath);
    process.exit(0);
  } catch (err) {
    console.error('Failed to generate QR:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
