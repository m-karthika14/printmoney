const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function runSweep(options = {}) {
  const { dryRun = false, batchSize = 500 } = options;
  console.log('[DAILYSTATS-SWEEP] starting sweep', new Date().toISOString(), dryRun ? '(dryRun)' : '');
  let totalProcessed = 0;
  try {
    while (true) {
      // Atomically claim up to batchSize FinalJobs so concurrent sweep workers don't double-process them.
      const claimed = [];
      for (let i = 0; i < batchSize; i++) {
        // findOneAndUpdate will atomically set a claim timestamp on a single document and return it.
        const doc = await FinalJob.findOneAndUpdate(
          { job_status: 'completed', dailyIncrementDone: { $ne: true }, dailyIncrementClaimedAt: { $exists: false } },
          { $set: { dailyIncrementClaimedAt: new Date() } },
          { sort: { createdAt: 1 }, new: true }
        ).exec();
        if (!doc) break;
        claimed.push(doc.toObject ? doc.toObject() : doc);
      }
      if (claimed.length === 0) break;

      // group claimed docs by shop_id and day
      const perShop = Object.create(null);
      for (const j of claimed) {
        const sid = j.shop_id || j.shopId || j.shop || 'unknown';
        const d = new Date(j.completed_at || j.updatedAt || j.createdAt || Date.now());
        const dayKey = d.toISOString().slice(0,10);
        const amt = (typeof j.total_amount === 'number') ? j.total_amount : (Number(j.total_amount) || 0);
        if (!perShop[sid]) perShop[sid] = Object.create(null);
        if (!perShop[sid][dayKey]) perShop[sid][dayKey] = { count: 0, revenue: 0, ids: [] };
        perShop[sid][dayKey].count += 1;
        perShop[sid][dayKey].revenue += amt;
        perShop[sid][dayKey].ids.push(j._id);
      }

      // apply per shop
      for (const [sid, days] of Object.entries(perShop)) {
        const incObj = {};
        const setObj = {};
        let incLifetimeJobs = 0;
        let incLifetimeRevenue = 0;
        for (const [day, vals] of Object.entries(days)) {
          incObj[`dailystats.${day}.totalJobsCompleted`] = vals.count;
          setObj[`dailystats.${day}.createdAt`] = new Date();
          incObj[`totalRevenue.daily.${day}.totalRevenue`] = vals.revenue;
          incLifetimeJobs += vals.count;
          incLifetimeRevenue += vals.revenue;
        }
        if (incLifetimeJobs) incObj.lifetimeJobsCompleted = incLifetimeJobs;
        if (incLifetimeRevenue) incObj.lifetimeRevenue = incLifetimeRevenue;

        if (dryRun) {
          console.log('[DAILYSTATS-SWEEP][dry] shop', sid, 'apply', JSON.stringify({ incObj, setObj }, null, 2));
        } else {
          try {
            await NewShop.updateOne({ shop_id: sid }, { $inc: incObj, $set: setObj }).exec();
            // mark processed FinalJobs (set dailyIncrementDone and record appliedAt; remove claim marker)
            const ids = Object.values(days).flatMap(d => d.ids);
            if (ids.length) {
              await FinalJob.updateMany(
                { _id: { $in: ids }, dailyIncrementDone: { $ne: true } },
                { $set: { dailyIncrementDone: true, dailyIncrementAppliedAt: new Date() }, $unset: { dailyIncrementClaimedAt: '' } }
              ).exec();
            }
            console.log('[DAILYSTATS-SWEEP] applied for shop', sid, Object.keys(days).length, 'day(s)');
          } catch (e) {
            console.error('[DAILYSTATS-SWEEP] failed apply for shop', sid, e && e.message ? e.message : e);
            // On failure, release claims so jobs can be retried by future runs
            try {
              const ids = Object.values(days).flatMap(d => d.ids);
              if (ids.length) {
                await FinalJob.updateMany({ _id: { $in: ids } }, { $unset: { dailyIncrementClaimedAt: '' } }).exec();
              }
            } catch (releaseErr) {
              console.error('[DAILYSTATS-SWEEP] failed to release claims:', releaseErr && releaseErr.message ? releaseErr.message : releaseErr);
            }
          }
        }
        totalProcessed += Object.values(days).reduce((s, v) => s + v.count, 0);
      }

      // small pause to yield
      await new Promise(r => setTimeout(r, 50));
      // continue to next batch
    }
  console.log('[DAILYSTATS-SWEEP] completed sweep - processed', totalProcessed, 'jobs');
    return { processed: totalProcessed };
  } catch (err) {
    console.error('[DAILYSTATS-SWEEP] error:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = { runSweep };
