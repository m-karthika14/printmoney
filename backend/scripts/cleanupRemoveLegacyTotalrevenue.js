require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function cleanup() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const result = await NewShop.updateMany(
      { totalrevenue: { $exists: true } },
      { $unset: { totalrevenue: '' } }
    );
    console.log(`[CLEANUP] Unset legacy totalrevenue on ${result.modifiedCount || 0} documents`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  cleanup().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { cleanup };
