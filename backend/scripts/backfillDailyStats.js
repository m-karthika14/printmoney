const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function backfill() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Run with `node -r dotenv/config scripts/backfillDailyStats.js`');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('[backfillDailyStats] aggregating FinalJob (completed only) by shop and date...');
  // Only completed jobs; use completed_at if present, else createdAt
  const pipeline = [
    { $match: { job_status: 'completed' } },
    { $project: { shop_id: 1, when: { $ifNull: ['$completed_at', '$createdAt'] } } },
    { $project: { shop_id: 1, dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$when' } } } },
    { $group: { _id: { shop_id: '$shop_id', date: '$dateStr' }, count: { $sum: 1 } } },
    { $sort: { '_id.shop_id': 1, '_id.date': 1 } }
  ];

  const results = await FinalJob.aggregate(pipeline);
  let updated = 0;
  const normalized = new Set();
  for (const doc of results) {
    const shopId = doc._id.shop_id;
    const date = doc._id.date;
    const count = doc.count;

    if (!normalized.has(shopId)) {
      const current = await NewShop.findOne({ $or: [{ shop_id: shopId }, { shopId: shopId }] }, { dailystats: 1 }).lean();
      if (current && Array.isArray(current.dailystats)) {
        // reset to empty map; we'll repopulate via this loop
        await NewShop.updateOne(
          { $or: [{ shop_id: shopId }, { shopId: shopId }] },
          { $set: { dailystats: {} } }
        );
      }
      normalized.add(shopId);
    }

    try {
      await NewShop.updateOne(
        { $or: [{ shop_id: shopId }, { shopId: shopId }] },
        { $set: { [`dailystats.${date}.totalJobsCompleted`]: count, [`dailystats.${date}.createdAt`]: new Date() } }
      );
    } catch (e) {
      // Handle legacy/invalid shape: coerce dailystats to an object and retry once
      const code = e && (e.code || e.codeName) ? e.code : undefined;
      if (code === 28 || /Cannot create field/.test(String(e))) {
        const shopDoc = await NewShop.findOne({ $or: [{ shop_id: shopId }, { shopId: shopId }] }).lean();
        let nextMap = {};
        const ds = shopDoc && shopDoc.dailystats;
        if (Array.isArray(ds)) {
          for (const entry of ds) {
            if (entry && entry.date) {
              nextMap[entry.date] = { totalJobsCompleted: entry.completedCount || entry.totalJobsCompleted || 0, createdAt: entry.createdAt || new Date() };
            }
          }
        }
        await NewShop.updateOne(
          { $or: [{ shop_id: shopId }, { shopId: shopId }] },
          { $set: { dailystats: nextMap } }
        );
        // retry update
        await NewShop.updateOne(
          { $or: [{ shop_id: shopId }, { shopId: shopId }] },
          { $set: { [`dailystats.${date}.totalJobsCompleted`]: count, [`dailystats.${date}.createdAt`]: new Date() } }
        );
      } else {
        throw e;
      }
    }
    updated++;
    if (updated % 100 === 0) console.log(`[backfillDailyStats] upserted ${updated} entries...`);
  }

  console.log(`[backfillDailyStats] done. total upserted entries: ${updated}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  (async () => {
    try {
      await backfill();
      process.exit(0);
    } catch (err) {
      console.error('[backfillDailyStats] error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { backfill };
