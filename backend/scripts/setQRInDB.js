const mongoose = require('mongoose');
const path = require('path');

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node setQRInDB.js <shopId>');
    process.exit(1);
  }
  const mongo = process.env.MONGO_URI;
  if (!mongo) {
    console.error('Please set MONGO_URI environment variable (e.g., in a .env file)');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
    const NewShop = require('../models/NewShop');
    const qrPath = `/uploads/qrcodes/${shopId}.png`;
    const res = await NewShop.updateOne({ shop_id: shopId }, { $set: { qr_code_url: qrPath } });
    if (res.matchedCount === 0 && res.n === 0) {
      // mongoose version differences: try alternative check
      if ((res.modifiedCount === 0 || res.matchedCount === undefined) && res.ok !== 1) {
        console.log('Update result:', res);
      }
    }
    console.log(`Set qr_code_url for ${shopId} -> ${qrPath}. Update result:`, res);
    process.exit(0);
  } catch (err) {
    console.error('Failed to update DB:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
