/*
Dry-run backfill for a single shop: lists FinalJobs that are completed but not applied to NewShop.dailystats
Usage: node backfillDryRunShop.js <shop_id>

This script does NOT write to the DB. It only prints what would be applied.
*/

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const { getIstDayKey } = require('../utils/ist');

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node backfillDryRunShop.js <shop_id>');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in .env'); process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[dryrun] connected to mongo');
  try {
    const cursor = FinalJob.find({ shop_id: shopId, job_status: 'completed', $or: [{ dailyIncrementDone: { $exists: false } }, { dailyIncrementDone: false }] }).cursor();
    let count = 0;
    const perDay = {};
    let totalRevenue = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      count++;
      const dayKey = getIstDayKey(doc.completed_at || doc.updatedAt || doc.createdAt || new Date());
      perDay[dayKey] = perDay[dayKey] || { count: 0, revenue: 0, jobs: [] };
      perDay[dayKey].count += 1;
      const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount)) ? Number(doc.total_amount) : 0;
      perDay[dayKey].revenue += amount;
      perDay[dayKey].jobs.push({ job_number: doc.job_number, id: doc._id?.toString(), completed_at: doc.completed_at, createdAt: doc.createdAt, amount });
      totalRevenue += amount;
    }

    console.log(`[dryrun] shop: ${shopId} -> ${count} completed FinalJob(s) missing dailyIncrementDone`);
    if (count === 0) {
      console.log('[dryrun] nothing to apply');
      await mongoose.disconnect();
      process.exit(0);
    }
    console.log('[dryrun] per-day summary:');
    Object.keys(perDay).sort().forEach(k => {
      const v = perDay[k];
      console.log(`  ${k}: jobs=${v.count}, revenue=${v.revenue.toFixed(2)}`);
    });
    console.log('[dryrun] total revenue across jobs:', totalRevenue.toFixed(2));
    console.log('[dryrun] sample job details (first 20):');
    let printed = 0;
    for (const k of Object.keys(perDay).sort()) {
      for (const j of perDay[k].jobs) {
        if (printed >= 20) break;
        console.log(`  - ${j.job_number} (${j.id}) day=${k} amount=${j.amount} createdAt=${j.createdAt} completed_at=${j.completed_at}`);
        printed++;
      }
      if (printed >= 20) break;
    }

    await mongoose.disconnect();
    console.log('[dryrun] disconnected');
    process.exit(0);
  } catch (e) {
    console.error('[dryrun] error', e && e.message ? e.message : e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

if (require.main === module) main();
