require('dotenv').config();
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/printmoney';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[BACKFILL] Connected');
  try {
  const shops = await NewShop.find({}, { shop_id: 1 }).lean();
    console.log('[BACKFILL] shops:', shops.length);
    let totalBuckets = 0;
    for (const s of shops) {
      const sid = s.shop_id || s.shopId;
      if (!sid) continue;
      // Aggregate completed FinalJobs grouped by calendar day of createdAt
      const rows = await FinalJob.aggregate([
        { $match: { shop_id: sid, job_status: 'completed' } },
        { $project: {
            amount: {
              $cond: [
                { $ne: ['$total_amount', null] },
                { $cond: [ { $isNumber: '$total_amount' }, '$total_amount', { $convert: { input: '$total_amount', to: 'double', onError: 0, onNull: 0 } } ] },
                { $cond: [ { $ne: ['$totalAmount', null] }, { $cond: [ { $isNumber: '$totalAmount' }, '$totalAmount', { $convert: { input: '$totalAmount', to: 'double', onError: 0, onNull: 0 } } ] }, 0 ] }
              ]
            },
            createdAt: '$createdAt'
        } },
        { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$createdAt', new Date(0)] } } } } },
        { $group: { _id: '$day', totalRevenue: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]);

      const setDoc = {};
      for (const r of rows) {
        totalBuckets += 1;
        setDoc[`totalrevenue.${r._id}.totalRevenue`] = r.totalRevenue || 0;
      }
      if (Object.keys(setDoc).length > 0) {
        await NewShop.updateOne(
          { shop_id: sid },
          { $set: setDoc }
        );
        console.log(`[BACKFILL] ${sid} buckets=${rows.length}`);
      } else {
        console.log(`[BACKFILL] ${sid} no completed jobs`);
      }
    }
    console.log('[BACKFILL] done. totalBuckets=', totalBuckets);
  } catch (e) {
    console.error('[BACKFILL] error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
