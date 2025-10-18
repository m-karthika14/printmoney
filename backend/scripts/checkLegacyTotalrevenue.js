require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const docs = await NewShop.find({ totalrevenue: { $exists: true } }, { shop_id: 1, shopId: 1 }).limit(10).lean();
    const count = await NewShop.countDocuments({ totalrevenue: { $exists: true } });
    console.log(`[CHECK] Shops with legacy totalrevenue: ${count}`);
    if (docs.length) {
      console.log('[CHECK] Sample shop IDs:', docs.map(d => d.shop_id || d.shopId));
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  check().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { check };
