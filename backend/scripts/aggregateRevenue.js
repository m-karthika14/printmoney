require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

function ymd(date) { return date.toISOString().slice(0,10); }
function getWeekKey(start, end) { return `${ymd(start)}_to_${ymd(end)}`; }
function monthKey(date) { return date.toISOString().slice(0,7); }
function yearKey(date) { return String(date.getUTCFullYear()); }

async function aggregateRevenue() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const shops = await NewShop.find({}, { shop_id: 1, shopId: 1, totalRevenue: 1 }).lean();
    for (const s of shops) {
      const sid = s.shop_id || s.shopId; if (!sid) continue;

      // 1) Daily: recompute last 60 days for safety
      const startDay = new Date(); startDay.setUTCDate(startDay.getUTCDate() - 60); startDay.setUTCHours(0,0,0,0);
      const dailyRows = await FinalJob.aggregate([
        { $match: { shop_id: sid, job_status: 'completed', createdAt: { $gte: startDay } } },
        { $project: { 
          amount: {
            $cond: [
              { $ne: ['$total_amount', null] },
              { $cond: [ { $isNumber: '$total_amount' }, '$total_amount', { $convert: { input: '$total_amount', to: 'double', onError: 0, onNull: 0 } } ] },
              { $cond: [ { $ne: ['$totalAmount', null] }, { $cond: [ { $isNumber: '$totalAmount' }, '$totalAmount', { $convert: { input: '$totalAmount', to: 'double', onError: 0, onNull: 0 } } ] }, 0 ] }
            ]
          },
          createdAt: 1 
        } },
        { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
        { $group: { _id: '$day', total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]);
      const setDaily = {};
      for (const r of dailyRows) setDaily[`totalRevenue.daily.${r._id}.totalRevenue`] = r.total || 0;
      if (Object.keys(setDaily).length) await NewShop.updateOne({ $or: [{ shop_id: sid }, { shopId: sid }] }, { $set: setDaily });

      // Reload the doc to manipulate maps
      const shop = await NewShop.findOne({ $or: [{ shop_id: sid }, { shopId: sid }] });
      if (!shop) continue;

      // 2) Weekly rollup: when 7 or more daily entries exist for an unrolled week, create a week and delete those 7
      const dailyEntries = Array.from((shop.totalRevenue?.daily || new Map()).entries()).sort((a,b) => a[0].localeCompare(b[0]));
      while (dailyEntries.length >= 7) {
        const slice = dailyEntries.slice(0,7);
        const first = new Date(slice[0][0] + 'T00:00:00Z');
        const last = new Date(slice[6][0] + 'T00:00:00Z');
        const wKey = getWeekKey(first, last);
        const wSum = slice.reduce((sum, [,v]) => sum + (v?.totalRevenue || 0), 0);
        shop.totalRevenue.weekly.set(wKey, { totalRevenue: wSum, createdAt: new Date() });
        // delete those 7 from daily
        for (const [k] of slice) shop.totalRevenue.daily.delete(k);
        // refresh dailyEntries to reflect deletion
        const rem = Array.from(shop.totalRevenue.daily.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
        dailyEntries.length = 0; dailyEntries.push(...rem);
      }

      // 3) Monthly rollup: sum all weekly buckets fully contained within the same month key
      const weeklyEntries = Array.from(shop.totalRevenue.weekly.entries());
      const byMonth = new Map();
      for (const [k, v] of weeklyEntries) {
        const startStr = k.split('_to_')[0];
        const mk = startStr.slice(0,7);
        byMonth.set(mk, (byMonth.get(mk) || 0) + (v?.totalRevenue || 0));
      }
      for (const [mk, sum] of byMonth.entries()) {
        if (sum > 0) {
          shop.totalRevenue.monthly.set(mk, { totalRevenue: sum, createdAt: new Date() });
          // delete weekly that belong to this month
          for (const [wk] of weeklyEntries) {
            if (wk.startsWith(mk)) shop.totalRevenue.weekly.delete(wk);
          }
        }
      }

      // 4) Yearly rollup: sum months belonging to the same year
      const monthlyEntries = Array.from(shop.totalRevenue.monthly.entries());
      const byYear = new Map();
      for (const [mk, v] of monthlyEntries) {
        const yk = mk.slice(0,4);
        byYear.set(yk, (byYear.get(yk) || 0) + (v?.totalRevenue || 0));
      }
      for (const [yk, sum] of byYear.entries()) {
        if (sum > 0) {
          shop.totalRevenue.yearly.set(yk, { totalRevenue: sum, createdAt: new Date() });
          for (const [mk] of monthlyEntries) {
            if (mk.startsWith(yk)) shop.totalRevenue.monthly.delete(mk);
          }
        }
      }

      await shop.save();
      console.log('[AGG]', sid, 'daily=', shop.totalRevenue.daily.size, 'weekly=', shop.totalRevenue.weekly.size, 'monthly=', shop.totalRevenue.monthly.size, 'yearly=', shop.totalRevenue.yearly.size);
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  aggregateRevenue().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { aggregateRevenue };
