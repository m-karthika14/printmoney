// Migration script: ensure pricing.paperSizePricing.<size>.selected is set correctly
// Usage:
//   set MONGO_URI to your MongoDB connection string or rely on default mongodb://localhost:27017/printmoney
//   node backend/scripts/migratePaperSizeSelected.js

const mongoose = require('mongoose');
const path = require('path');

// Load dotenv from backend/.env so MONGO_URI from the repo is picked up when running script locally
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} catch (e) {
  // ignore if dotenv isn't installed or file missing
}

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/printmoney';

// require model
const NewShop = require(path.resolve(__dirname, '..', 'models', 'NewShop'));

async function run() {
  console.log('Connecting to', MONGO_URI);
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('Connected. Scanning shops...');

  const cursor = NewShop.find().cursor();
  let count = 0;
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    count++;
    const psp = doc.pricing && doc.pricing.paperSizePricing;
    if (!psp) continue;

    let changed = false;

    Object.keys(psp).forEach(size => {
      const paper = psp[size] || {};

      const hasValue =
        (paper.bwSingle && paper.bwSingle > 0) ||
        (paper.colorSingle && paper.colorSingle > 0) ||
        (paper.bwDouble && paper.bwDouble > 0) ||
        (paper.colorDouble && paper.colorDouble > 0);

      const should = !!hasValue;

      // If selected is missing or different, update
      if (paper.selected !== should) {
        paper.selected = should;
        changed = true;
      }
    });

    if (changed) {
      try {
        await doc.save();
        updated++;
        console.log(`Updated shop ${doc.shop_id || doc._id}: updated selected flags`);
      } catch (err) {
        console.error(`Failed to save shop ${doc.shop_id || doc._id}:`, err.message || err);
      }
    }
  }

  console.log(`Finished. Scanned ${count} shops, updated ${updated} documents.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
