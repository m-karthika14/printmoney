const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const NewShop = require('../models/NewShop');

async function generateShopQRFile(shop_id) {
  try {
    if (!shop_id) throw new Error('shop_id is required');
    const qrLink = `https://www.eazeprint.com/app?shop=${encodeURIComponent(shop_id)}`;

    // Ensure uploads/qrcodes folder exists relative to backend folder
    const folderPath = path.join(__dirname, '..', 'uploads', 'qrcodes');
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    // File path for the QR PNG
    const filePath = path.join(folderPath, `${shop_id}.png`);
    await QRCode.toFile(filePath, qrLink, { width: 300 });

    // Save relative URL in MongoDB
    const qrUrl = `/uploads/qrcodes/${shop_id}.png`;
  await NewShop.updateOne({ shop_id }, { $set: { qr_code_url: qrUrl } });

    console.log(`QR PNG generated for shop ${shop_id}`);
    return qrUrl;
  } catch (err) {
    console.error(`Failed to generate QR for ${shop_id}:`, err.message);
    throw err;
  }
}

module.exports = { generateShopQRFile };
