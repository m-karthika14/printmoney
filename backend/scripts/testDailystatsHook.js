/*
 Quick test to verify FinalJob model hook increments NewShop.dailystats when a job transitions to completed.
 - Loads .env next to backend
 - Creates NewShop and FinalJob
 - Calls findByIdAndUpdate to set job_status='completed' and completed_at
 - Waits for hooks to run, then prints NewShop.dailystats and FinalJob.dailyIncrementDone
 - Cleans up test documents

 Usage: node testDailystatsHook.js
 */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[test] connected to mongo');

  const ts = Date.now();
  const shopId = `test_shop_${ts}`;
  const jobNumber = `TESTJOB_${ts}`;

  try {
    // Create test shop
  const shop = new NewShop({ shopName: 'Test Shop', email: `test+${ts}@example.com`, phone: '000', address: '1 Test St', password: 'x', shop_id: shopId, apiKey: `k${ts}` });
    await shop.save();
    console.log('[test] created shop', shopId);

    // Create final job (pending)
    const fj = new FinalJob({ job_number: jobNumber, shop_id: shopId, job_status: 'pending', total_amount: 42 });
    await fj.save();
    console.log('[test] created FinalJob', jobNumber, 'id', fj._id.toString());

    // Update to completed using findByIdAndUpdate to exercise the findOneAndUpdate hooks used in code
    const completedAt = new Date();
    const updated = await FinalJob.findByIdAndUpdate(fj._id, { job_status: 'completed', completed_at: completedAt }, { new: true });
    console.log('[test] updated FinalJob to completed:', updated._id.toString());

    // Wait briefly for hooks to execute
    await sleep(1500);

    // Fetch shop to inspect dailystats
    const shopAfter = await NewShop.findOne({ shop_id: shopId }).lean();
    console.log('[test] shopAfter.dailystats:', JSON.stringify(shopAfter.dailystats || {}, null, 2));
    console.log('[test] shopAfter.lifetimeJobsCompleted:', shopAfter.lifetimeJobsCompleted);
    console.log('[test] shopAfter.lifetimeRevenue:', shopAfter.lifetimeRevenue);

    // Fetch finaljob to inspect dailyIncrementDone
    const finalAfter = await FinalJob.findById(fj._id).lean();
    console.log('[test] finalAfter.dailyIncrementDone:', finalAfter.dailyIncrementDone);

    // Cleanup
    await FinalJob.deleteOne({ _id: fj._id });
    await NewShop.deleteOne({ shop_id: shopId });
    console.log('[test] cleaned up test documents');

    await mongoose.disconnect();
    console.log('[test] disconnected');
    process.exit(0);
  } catch (e) {
    console.error('[test] error', e && e.message ? e.message : e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

if (require.main === module) main();
