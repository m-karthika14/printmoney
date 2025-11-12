/**
 * Backfill NewShop.dailystats from FinalJob.completed jobs.
 *
 * Usage: MONGO_URI="mongodb://..." node backfillDailystatsFromFinalJobs.js
 *
 * Behavior:
 * - Iterates FinalJob documents with job_status === 'completed'
 * - Uses completed_at (fallback to updatedAt/createdAt) to compute YYYY-MM-DD UTC key
 * - For each job not previously marked with dailyIncrementDone, increments NewShop.dailystats.<day>.totalJobsCompleted by 1
 * - Marks FinalJob.dailyIncrementDone = true after successfully applying the increment
 *
 * NOTE: Run on a controlled environment / backup DB first.
 */

const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');
const { getIstDayKey } = require('../utils/ist');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not provided. Set MONGO_URI env var and try again.');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  console.log('[backfill] scanning FinalJob.completed documents...');

  // Stream cursor to avoid memory pressure
  const cursor = FinalJob.find({ job_status: 'completed' }).cursor();
  let processed = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      // Skip if already applied
      if (doc.dailyIncrementDone) continue;
      const dayKey = getIstDayKey(doc.completed_at || doc.updatedAt || doc.createdAt || new Date());
      const sid = doc.shop_id;
      if (!sid) continue;

      const incOps = { [`dailystats.${dayKey}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
      const setOps = { [`dailystats.${dayKey}.createdAt`]: new Date() };
      const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount)) ? Number(doc.total_amount) : 0;
      if (amount > 0) {
        incOps[`totalRevenue.daily.${dayKey}.totalRevenue`] = amount;
        incOps.lifetimeRevenue = amount;
        setOps[`totalRevenue.daily.${dayKey}.createdAt`] = new Date();
      }

      await NewShop.updateOne({ shop_id: sid }, { $inc: incOps, $set: setOps });
      await FinalJob.updateOne({ _id: doc._id }, { $set: { dailyIncrementDone: true } });
      processed++;
      if (processed % 500 === 0) console.log(`[backfill] processed ${processed}`);
    } catch (e) {
      console.error('[backfill] failed for job', doc && doc.job_number, e && e.message ? e.message : e);
    }
  }

  console.log('[backfill] done. processed:', processed);
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
