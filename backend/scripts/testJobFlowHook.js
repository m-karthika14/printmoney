/*
 Test Job -> FinalJob sync path and FinalJob hook increments NewShop.dailystats.
 Usage: node testJobFlowHook.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');
const FinalJob = require('../models/FinalJob');
const Job = require('../models/Job');

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function main(){
  const uri = process.env.MONGO_URI;
  if(!uri){ console.error('MONGO_URI missing'); process.exit(1); }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('[jobflow] connected');
  const ts = Date.now();
  const shopId = `jobflow_shop_${ts}`;
  const jn = `JOBFLOW_${ts}`;
  try{
    const shop = new NewShop({ shopName: 'JobFlow Shop', email: `jf+${ts}@example.com`, phone: '000', address: '1 Test St', password: 'x', shop_id: shopId, apiKey: `k${ts}` });
    await shop.save();
    console.log('[jobflow] created shop', shopId);

    const final = new FinalJob({ job_number: jn, shop_id: shopId, job_status: 'pending', total_amount: 50 });
    await final.save();
    console.log('[jobflow] created FinalJob', jn);

  const job = new Job({ customer: { name: 'test' }, job_number: jn, shop_id: shopId, job_status: 'pending', printer_status: 'alloted', total_amount: 50 });
    await job.save();
    console.log('[jobflow] created Job', jn);

    // Now update Job to completed using findOneAndUpdate (simulate agent/flow)
    const updatedJob = await Job.findOneAndUpdate({ job_number: jn }, { $set: { job_status: 'completed', completed_at: new Date() } }, { new: true });
    console.log('[jobflow] updated Job to completed');

    await sleep(1500);

    const shopAfter = await NewShop.findOne({ shop_id: shopId }).lean();
    console.log('[jobflow] shopAfter.dailystats:', JSON.stringify(shopAfter.dailystats || {}, null, 2));
    console.log('[jobflow] shopAfter.lifetimeJobsCompleted:', shopAfter.lifetimeJobsCompleted);

    const finalAfter = await FinalJob.findOne({ job_number: jn }).lean();
    console.log('[jobflow] finalAfter.dailyIncrementDone:', finalAfter.dailyIncrementDone);

    // Cleanup
    await Job.deleteOne({ job_number: jn });
    await FinalJob.deleteOne({ job_number: jn });
    await NewShop.deleteOne({ shop_id: shopId });
    console.log('[jobflow] cleaned up');

    await mongoose.disconnect();
    process.exit(0);
  } catch(e){ console.error('[jobflow] error', e && e.message ? e.message : e); try{ await mongoose.disconnect(); }catch{}; process.exit(1);} }

if(require.main === module) main();