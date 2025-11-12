require('dotenv').config();
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/printmoney';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[BACKFILL-LIFETIME] Connected');
  try {
    // Aggregate completed counts and sum revenue grouped by shop_id
    const rows = await FinalJob.aggregate([
      { $match: { job_status: 'completed' } },
      { $project: { shop_id: 1, amount: { $convert: { input: { $ifNull: ['$total_amount', '$totalAmount'] }, to: 'double', onError: 0, onNull: 0 } } } },
      { $group: { _id: '$shop_id', totalJobs: { $sum: 1 }, totalRevenue: { $sum: '$amount' } } }
    ]);

    console.log('[BACKFILL-LIFETIME] shops aggregated:', rows.length);
    for (const r of rows) {
      const sid = r._id;
      if (!sid) continue;
      const totalJobs = r.totalJobs || 0;
      const totalRevenue = r.totalRevenue || 0;
      await NewShop.updateOne({ shop_id: sid }, { $set: { lifetimeJobsCompleted: totalJobs, lifetimeRevenue: totalRevenue } });
      console.log(`[BACKFILL-LIFETIME] shop=${sid} jobs=${totalJobs} revenue=${totalRevenue}`);
    }
    console.log('[BACKFILL-LIFETIME] done');
  } catch (e) {
    console.error('[BACKFILL-LIFETIME] error', e);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) main();

module.exports = { main };
