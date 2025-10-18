require('dotenv').config();
const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');

async function debug() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const shop = process.argv[2] || 'T47439k';
    console.log('Shop:', shop);
    const all = await FinalJob.find({ shop_id: shop }).sort({ updatedAt: -1 }).lean();
    console.log('Total finaljobs found:', all.length);
    for (const f of all.slice(0, 20)) {
      console.log({ job_number: f.job_number, job_status: f.job_status, createdAt: f.createdAt, completed_at: f.completed_at, total_amount: f.total_amount, totalAmount: f.totalAmount });
    }

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    console.log('todayStart:', todayStart.toISOString(), 'todayEnd:', todayEnd.toISOString());

    const rows = await FinalJob.aggregate([
      { $match: { shop_id: shop, job_status: 'completed', $or: [ { completed_at: { $gte: todayStart, $lt: todayEnd } }, { createdAt: { $gte: todayStart, $lt: todayEnd } } ] } },
      { $project: { amount: { $convert: { input: { $ifNull: ['$total_amount', '$totalAmount'] }, to: 'double', onError: 0, onNull: 0 } } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    console.log('Aggregated rows:', JSON.stringify(rows, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  debug().catch(e => { console.error(e); process.exit(1); });
}
