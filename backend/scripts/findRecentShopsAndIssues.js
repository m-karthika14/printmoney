/*
Find recently created shops and report whether their dailystats get updated.
Usage: node findRecentShopsAndIssues.js [hours]
Defaults to last 2 hours.
This is read-only diagnostics.
*/
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

async function main() {
  const hours = Number(process.argv[2]) || 2;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI missing'); process.exit(1); }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[scan] connected to mongo; looking for shops created since', since.toISOString());
  try {
    const shops = await NewShop.find({ createdAt: { $gte: since } }).lean();
    console.log('[scan] found', shops.length, 'recent shops');
    for (const s of shops) {
      console.log('\n=== Shop:', s.shop_id, 'createdAt:', s.createdAt, '===');
      const dsKeys = Object.keys(s.dailystats || {});
      console.log('dailystats keys:', dsKeys.length ? dsKeys.join(', ') : '(none)');
      const finals = await FinalJob.find({ shop_id: s.shop_id }).sort({ createdAt: -1 }).limit(10).lean();
      console.log('latest FinalJobs (up to 10):', finals.length);
      for (const f of finals) {
        console.log(' -', f.job_number, 'status:', f.job_status, 'dailyIncrementDone:', !!f.dailyIncrementDone, 'createdAt:', f.createdAt, 'completed_at:', f.completed_at);
      }
      // show any completed FinalJobs missing dailyIncrementDone
      const missed = await FinalJob.countDocuments({ shop_id: s.shop_id, job_status: 'completed', $or: [{ dailyIncrementDone: { $exists: false } }, { dailyIncrementDone: false }] });
      console.log('completed FinalJobs missing dailyIncrementDone:', missed);
    }
    await mongoose.disconnect();
    console.log('\n[scan] done');
    process.exit(0);
  } catch (e) {
    console.error('[scan] error', e && e.message ? e.message : e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

if (require.main === module) main();
