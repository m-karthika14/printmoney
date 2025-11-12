const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

async function updateDailyStats(options = {}) {
  // options: { dryRun: boolean }
  const dryRun = !!options.dryRun;
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  const shops = await NewShop.find({}, { shop_id: 1, shopName: 1 }).lean();
  // Use UTC calendar-day window for "today" (00:00Z - 24:00Z)
  const { getIstDayRangeFor } = require('./ist');
  const { start, end, dayStr } = getIstDayRangeFor(new Date());

  const results = [];
  for (const s of shops) {
  const sid = s.shop_id;
    if (!sid) continue;
    const completed = await FinalJob.countDocuments({
      shop_id: sid,
      job_status: 'completed',
      $or: [
        { completed_at: { $gte: start, $lt: end } },
        { createdAt: { $gte: start, $lt: end } }
      ]
    });

    results.push({ shop: sid, shopName: s.shopName, date: dayStr, completed });

    if (dryRun) continue;

    // NewShop.dailystats is stored as a Map keyed by YYYY-MM-DD. Write directly to the map
    // using the map key `dailystats.<dayStr>`. Use canonical property name `totalJobsCompleted` to
    // match the schema and the frontend expectations.
    await NewShop.updateOne(
      { shop_id: sid },
      { $set: { [`dailystats.${dayStr}.totalJobsCompleted`]: completed, [`dailystats.${dayStr}.createdAt`]: new Date() } }
    );
  }

  return results;
}

// If run directly, execute and exit
if (require.main === module) {
  (async () => {
    try {
      console.log('[updateDailyStats] starting');
      const res = await updateDailyStats({ dryRun: false });
      console.log('[updateDailyStats] results:', res.slice(0,5));
      console.log('[updateDailyStats] done.');
      process.exit(0);
    } catch (err) {
      console.error('[updateDailyStats] error:', err);
      process.exit(1);
    }
  })();
}

module.exports = { updateDailyStats };
