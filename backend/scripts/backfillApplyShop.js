/*
Apply backfill for a single shop: increments NewShop.dailystats for completed FinalJobs missing dailyIncrementDone.
Usage: node backfillApplyShop.js <shop_id>

This script WILL write to the DB. It's idempotent: it only updates FinalJobs where dailyIncrementDone is missing/false.
*/

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');
const { getIstDayKey } = require('../utils/ist');

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node backfillApplyShop.js <shop_id>');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in .env'); process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[apply] connected to mongo');
  try {
    const cursor = FinalJob.find({ shop_id: shopId, job_status: 'completed', $or: [{ dailyIncrementDone: { $exists: false } }, { dailyIncrementDone: false }] }).cursor();
    let applied = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      try {
        const dayKey = getIstDayKey(doc.completed_at || doc.updatedAt || doc.createdAt || new Date());
        const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount)) ? Number(doc.total_amount) : 0;
        const incOps = { [`dailystats.${dayKey}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
        const setOps = { [`dailystats.${dayKey}.createdAt`]: new Date() };
        if (amount > 0) {
          incOps[`totalRevenue.daily.${dayKey}.totalRevenue`] = amount;
          incOps.lifetimeRevenue = amount;
          setOps[`totalRevenue.daily.${dayKey}.createdAt`] = new Date();
        }
        const res = await NewShop.updateOne({ shop_id: shopId }, { $inc: incOps, $set: setOps });
        if (res && (res.matchedCount === 1 || res.n === 1)) {
          await FinalJob.updateOne({ _id: doc._id }, { $set: { dailyIncrementDone: true } });
          applied++;
          console.log(`[apply] applied job ${doc.job_number} -> day ${dayKey} amount ${amount}`);
        } else {
          console.warn('[apply] NewShop not found or update failed for', shopId);
        }
      } catch (e) {
        console.error('[apply] failed for job', doc.job_number, e && e.message ? e.message : e);
      }
    }
    console.log('[apply] done. applied:', applied);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[apply] error', e && e.message ? e.message : e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

if (require.main === module) main();
