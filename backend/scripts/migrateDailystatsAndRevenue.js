require('dotenv').config();
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

async function migrate(options = {}) {
  const dryRun = !!options.dryRun;
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/printmoney';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[MIGRATE] Connected to Mongo');
  try {
    const shops = await NewShop.find({}, { shop_id: 1, dailystats: 1, totalrevenue: 1, totalRevenue: 1 }).lean();
    console.log('[MIGRATE] shops:', shops.length);
    let touched = 0;
    for (const s of shops) {
      const sid = s.shop_id || s.shopId;
      if (!sid) continue;
      const updates = {};
      // 1) dailystats: if array, convert to map-style
      const ds = s.dailystats;
      if (Array.isArray(ds)) {
        const { getIstDayKey } = require('../utils/ist');
        for (const item of ds) {
          const dateKey = item && (item.date || (item.createdAt ? getIstDayKey(new Date(item.createdAt)) : null));
          if (!dateKey) continue;
          const val = (typeof item.totalJobsCompleted === 'number') ? item.totalJobsCompleted : (typeof item.completedCount === 'number' ? item.completedCount : 0);
          updates[`dailystats.${dateKey}.totalJobsCompleted`] = val;
          updates[`dailystats.${dateKey}.createdAt`] = item.createdAt ? new Date(item.createdAt) : new Date();
        }
      } else if (ds && typeof ds === 'object') {
        // Map-style: check if values use legacy completedCount instead of totalJobsCompleted
        for (const [k, v] of Object.entries(ds)) {
          if (v && typeof v === 'object' && typeof v.completedCount === 'number' && typeof v.totalJobsCompleted === 'undefined') {
            updates[`dailystats.${k}.totalJobsCompleted`] = v.completedCount;
            if (v.createdAt) updates[`dailystats.${k}.createdAt`] = new Date(v.createdAt);
          }
        }
      }

      // 2) totalRevenue: legacy `totalrevenue` (lowercase) or mis-nested keys -> move into totalRevenue.daily
      const legacyRevenue = s.totalrevenue || s.totalrevenue || null;
      if (legacyRevenue && typeof legacyRevenue === 'object' && Object.keys(legacyRevenue).length > 0) {
        for (const [k, v] of Object.entries(legacyRevenue)) {
          // v may be { totalRevenue: number } or a raw number
          const amount = (v && typeof v === 'object') ? (v.totalRevenue || v.total_revenue || 0) : (typeof v === 'number' ? v : 0);
          updates[`totalRevenue.daily.${k}.totalRevenue`] = Number(amount || 0);
          updates[`totalRevenue.daily.${k}.createdAt`] = (v && v.createdAt) ? new Date(v.createdAt) : new Date();
        }
      }

      // Also, if s.totalRevenue exists but top-level daily is empty and keys are under top-level (legacy shape), normalize
      if (s.totalRevenue && typeof s.totalRevenue === 'object') {
        // If keys like '2025-10-17' exist under s.totalRevenue directly (not under daily), move them to daily
        for (const [k, v] of Object.entries(s.totalRevenue)) {
          const maybeBucket = v && typeof v === 'object' && ('totalRevenue' in v);
          const isBucketUnderDaily = s.totalRevenue.daily && s.totalRevenue.daily[k];
          if (maybeBucket && !isBucketUnderDaily) {
            updates[`totalRevenue.daily.${k}.totalRevenue`] = v.totalRevenue || 0;
            updates[`totalRevenue.daily.${k}.createdAt`] = v.createdAt ? new Date(v.createdAt) : new Date();
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        touched += 1;
        console.log(`[MIGRATE] shop=${sid} will be updated with ${Object.keys(updates).length} fields`);
        if (!dryRun) {
          await NewShop.updateOne({ shop_id: sid }, { $set: updates });
          console.log(`[MIGRATE] shop=${sid} updated`);
        }
      }
    }
    console.log('[MIGRATE] done. touched=', touched);
  } catch (e) {
    console.error('[MIGRATE] error:', e);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry') || argv.includes('-n');
  migrate({ dryRun: dry }).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { migrate };
