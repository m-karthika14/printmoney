const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not set in environment. Please load backend/.env or set MONGO_URI');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const shop = 'T47439k';
    const now = new Date();
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate()+1);

    const completed24 = await FinalJob.countDocuments({ shop_id: shop, job_status: 'completed', $or: [ { completed_at: { $gte: since24 } }, { createdAt: { $gte: since24 } } ] });
    const completedToday = await FinalJob.countDocuments({ shop_id: shop, job_status: 'completed', $or: [ { completed_at: { $gte: todayStart, $lt: todayEnd } }, { createdAt: { $gte: todayStart, $lt: todayEnd } } ] });
    const sample = await FinalJob.find({ shop_id: shop }).sort({ createdAt: -1 }).limit(5).lean();

    console.log('T47439k - completed last 24h:', completed24);
    console.log('T47439k - completed today:', completedToday);
    console.log('Sample recent finaljobs (5):');
    for (const s of sample) {
      console.log({ id: s._id.toString(), job_number: s.job_number, job_status: s.job_status, createdAt: s.createdAt, completed_at: s.completed_at });
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
