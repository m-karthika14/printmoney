const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

async function rebuild() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Run with `node -r dotenv/config scripts/rebuildAllDailystatsFromFinalJob.js`');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  const shops = await NewShop.find({}, { shop_id: 1, shopId: 1, shopName: 1 }).lean();
  console.log(`[rebuildAllDailystats] shops found: ${shops.length}`);
  let shopsUpdated = 0;
  let totalDates = 0;
  for (const s of shops) {
    const sid = s.shop_id || s.shopId;
    if (!sid) continue;
    const agg = await FinalJob.aggregate([
      { $match: { shop_id: sid, job_status: 'completed' } },
      { $project: { when: { $ifNull: ['$completed_at', '$createdAt'] } } },
      { $project: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$when' } } } },
      { $group: { _id: '$dateStr', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const map = {};
    const now = new Date();
    for (const row of agg) {
      map[row._id] = { totalJobsCompleted: row.count, createdAt: now };
    }
    await NewShop.updateOne(
      { $or: [{ shop_id: sid }, { shopId: sid }] },
      { $set: { dailystats: map } }
    );
    shopsUpdated++;
    totalDates += agg.length;
    console.log(`  ✔ ${sid} (${s.shopName || ''}) dates: ${agg.length}`);
  }
  console.log(`[rebuildAllDailystats] done. shopsUpdated=${shopsUpdated}, totalDateBuckets=${totalDates}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  rebuild().then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1)});
}

module.exports = { rebuild };
