/*
 Diagnostic script: inspect NewShop and FinalJob/Job entries for a shop_id and show why dailystats may not have updated.
 Usage: node diagnoseDailystats.js <shop_id>
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');
const Job = require('../models/Job');

async function main() {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node diagnoseDailystats.js <shop_id>');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI missing in .env'); process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[diag] connected to mongo');
  try {
    const shop = await NewShop.findOne({ shop_id: shopId }).lean();
    if (!shop) {
      console.log('[diag] shop not found for', shopId);
    } else {
      console.log('[diag] NewShop:', JSON.stringify({ shop_id: shop.shop_id, createdAt: shop.createdAt, lifetimeJobsCompleted: shop.lifetimeJobsCompleted, lifetimeRevenue: shop.lifetimeRevenue, dailystatsKeys: Object.keys(shop.dailystats || {}) }, null, 2));
      console.log('[diag] dailystats snapshot:', JSON.stringify(shop.dailystats || {}, null, 2));
    }

    const finals = await FinalJob.find({ shop_id: shopId }).sort({ createdAt: -1 }).lean();
    console.log(`[diag] Found ${finals.length} FinalJob(s) for ${shopId}`);
    for (const f of finals) {
      console.log('---');
      console.log('id:', f._id?.toString());
      console.log('job_number:', f.job_number);
      console.log('job_status:', f.job_status);
      console.log('dailyIncrementDone:', f.dailyIncrementDone);
      console.log('completed_at:', f.completed_at);
      console.log('createdAt:', f.createdAt);
      console.log('updatedAt:', f.updatedAt);
      console.log('total_amount:', f.total_amount);
    }

    const jobs = await Job.find({ shop_id: shopId }).sort({ createdAt: -1 }).lean();
    console.log(`[diag] Found ${jobs.length} Job(s) for ${shopId}`);
    for (const j of jobs) {
      console.log('---');
      console.log('id:', j._id?.toString());
      console.log('job_number:', j.job_number);
      console.log('job_status:', j.job_status);
      console.log('completed_at:', j.completed_at);
      console.log('createdAt:', j.createdAt);
      console.log('updatedAt:', j.updatedAt);
      console.log('total_amount:', j.total_amount);
    }

    // List completed FinalJobs where dailyIncrementDone false (missed increments)
    const missed = await FinalJob.find({ shop_id: shopId, job_status: 'completed', $or: [{ dailyIncrementDone: { $exists: false } }, { dailyIncrementDone: false }] }).lean();
    console.log('[diag] completed FinalJobs with dailyIncrementDone missing/false:', missed.length);
    for (const m of missed) console.log('-', m.job_number, m._id?.toString(), 'completed_at:', m.completed_at, 'createdAt:', m.createdAt);

    await mongoose.disconnect();
    console.log('[diag] disconnected');
    process.exit(0);
  } catch (e) {
    console.error('[diag] error', e && e.message ? e.message : e);
    try { await mongoose.disconnect(); } catch {};
    process.exit(1);
  }
}

if (require.main === module) main();
