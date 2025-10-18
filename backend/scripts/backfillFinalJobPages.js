require('dotenv').config();
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Set totalpages = 0 where missing or null
    const res1 = await FinalJob.updateMany(
      { $or: [ { totalpages: { $exists: false } }, { totalpages: null } ] },
      { $set: { totalpages: 0 } }
    );
    console.log(`totalpages backfill -> matched: ${res1.matchedCount ?? res1.n}, modified: ${res1.modifiedCount ?? res1.nModified}`);

    // Set totalpagesprinted = 0 where missing or null
    const res2 = await FinalJob.updateMany(
      { $or: [ { totalpagesprinted: { $exists: false } }, { totalpagesprinted: null } ] },
      { $set: { totalpagesprinted: 0 } }
    );
    console.log(`totalpagesprinted backfill -> matched: ${res2.matchedCount ?? res2.n}, modified: ${res2.modifiedCount ?? res2.nModified}`);

  } catch (err) {
    console.error('Backfill error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
