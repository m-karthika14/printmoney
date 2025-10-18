const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

async function updateDailyStats(options = {}) {
  // options: { dryRun: boolean }
  const dryRun = !!options.dryRun;
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  const shops = await NewShop.find({}, { shop_id: 1, shopId: 1, shopName: 1 }).lean();
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const dayStr = start.toISOString().slice(0,10);

  const results = [];
  for (const s of shops) {
    const sid = s.shop_id || s.shopId;
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

    const updateResult = await NewShop.updateOne(
      { $or: [{ shop_id: sid }, { shopId: sid }], 'dailystats.date': dayStr },
      { $set: { 'dailystats.$.completedCount': completed, 'dailystats.$.createdAt': new Date() } }
    );
    if (!updateResult.modifiedCount) {
      await NewShop.updateOne(
        { $or: [{ shop_id: sid }, { shopId: sid }] },
        { $push: { dailystats: { date: dayStr, completedCount: completed, createdAt: new Date() } } }
      );
    }
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
