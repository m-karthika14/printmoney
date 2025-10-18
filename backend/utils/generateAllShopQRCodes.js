require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const NewShop = require('../models/NewShop');
const { generateShopQRFile } = require('./generateShopQRFile');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const filter = { $or: [{ qr_code_url: { $exists: false } }, { qr_code_url: null }] };
    const shops = await NewShop.find(filter, { shop_id: 1, shopId: 1, shopName: 1 });
    console.log(`Found ${shops.length} shops needing QR`);
    for (const s of shops) {
      const sid = s.shop_id || s.shopId;
      if (!sid) continue;
      try {
        await generateShopQRFile(sid);
        console.log(`OK: ${s.shopName || sid}`);
      } catch (e) {
        console.warn(`Skip ${sid}:`, e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
