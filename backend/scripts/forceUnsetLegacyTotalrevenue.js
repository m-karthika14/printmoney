require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function forceUnset() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const coll = mongoose.connection.collection('newshops');
    const res = await coll.updateMany(
      { totalrevenue: { $exists: true } },
      { $unset: { totalrevenue: '' } }
    );
    console.log('[FORCE-UNSET] result:', JSON.stringify({ matchedCount: res.matchedCount, modifiedCount: res.modifiedCount }));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  forceUnset().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { forceUnset };
