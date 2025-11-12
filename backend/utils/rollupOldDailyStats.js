const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

// Remove daily buckets older than retentionDays (defaults to 90). We rely on lifetime counters
// to preserve aggregate information; this keeps per-shop document size bounded.
async function rollupOldDailyStats(options = {}) {
  const retentionDays = Number(process.env.RETENTION_DAYS || 90);
  const dryRun = !!options.dryRun;
  if (!mongoose.connection || mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  const { getIstDayKey } = require('./ist');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffStr = getIstDayKey(cutoffDate);

  const shops = await NewShop.find({}, { shop_id: 1, dailystats: 1, totalRevenue: 1 }).lean();
  let totalRemoved = 0;
  for (const s of shops) {
    const sid = s.shop_id;
    if (!sid) continue;
    const unsetObj = {};
    const ds = s.dailystats || {};
    for (const dayKey of Object.keys(ds || {})) {
      if (dayKey < cutoffStr) {
        unsetObj[`dailystats.${dayKey}`] = "";
      }
    }
    const trDaily = (s.totalRevenue && s.totalRevenue.daily) || {};
    for (const dayKey of Object.keys(trDaily || {})) {
      if (dayKey < cutoffStr) {
        unsetObj[`totalRevenue.daily.${dayKey}`] = "";
      }
    }
    const keys = Object.keys(unsetObj);
    if (keys.length === 0) continue;
    totalRemoved += keys.length;
    if (dryRun) {
      console.log(`[ROLLUP][DRY] shop=${sid} would remove ${keys.length} keys`);
      continue;
    }
    try {
      await NewShop.updateOne({ shop_id: sid }, { $unset: unsetObj });
      console.log(`[ROLLUP] shop=${sid} removed ${keys.length} old keys`);
    } catch (e) {
      console.error(`[ROLLUP] shop=${sid} failed to unset keys:`, e.message);
    }
  }
  return { totalRemoved };
}

if (require.main === module) {
  (async () => {
    try {
      console.log('[ROLLUP] starting');
      const res = await rollupOldDailyStats({ dryRun: false });
      console.log('[ROLLUP] done', res);
      process.exit(0);
    } catch (e) {
      console.error('[ROLLUP] error', e);
      process.exit(1);
    }
  })();
}

module.exports = { rollupOldDailyStats };
