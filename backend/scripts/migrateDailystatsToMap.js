const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Run with `node -r dotenv/config scripts/migrateDailystatsToMap.js`');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const raw = NewShop.collection;
  const cursor = raw.find({}, { projection: { dailystats: 1 } });
  let migrated = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const ds = doc.dailystats;
    if (!Array.isArray(ds) || ds.length === 0) continue;
    const map = {};
    for (const entry of ds) {
      if (!entry) continue;
      const date = entry.date;
      if (!date) continue;
      const total = typeof entry.totalJobsCompleted === 'number' ? entry.totalJobsCompleted : (entry.completedCount || 0);
      const createdAt = entry.createdAt || new Date();
      map[date] = { totalJobsCompleted: total, createdAt };
    }
    await raw.updateOne({ _id: doc._id }, { $set: { dailystats: map } });
    migrated++;
  }
  console.log(`[migrateDailystatsToMap] migrated shops: ${migrated}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  migrate().then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1)});
}

module.exports = { migrate };
