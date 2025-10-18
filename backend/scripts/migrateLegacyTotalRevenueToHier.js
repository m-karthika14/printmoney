require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function migrate() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const shops = await NewShop.find({}, { totalrevenue: 1, shop_id: 1, shopId: 1 }).lean();
    let updated = 0, moved = 0;
    for (const s of shops) {
      const legacy = s.totalrevenue || {};
      const sets = {};
      for (const [day, obj] of Object.entries(legacy)) {
        const val = (obj && typeof obj.totalRevenue === 'number') ? obj.totalRevenue : 0;
        sets[`totalRevenue.daily.${day}.totalRevenue`] = val;
        sets[`totalRevenue.daily.${day}.createdAt`] = new Date();
        moved++;
      }
      if (Object.keys(sets).length) {
        await NewShop.updateOne({ $or: [{ shop_id: s.shop_id }, { shopId: s.shopId }] }, { $set: sets });
        updated++;
      }
    }
    console.log(`[MIGRATE] updated shops=${updated}, moved entries=${moved}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  migrate().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { migrate };
