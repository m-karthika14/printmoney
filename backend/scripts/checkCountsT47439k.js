const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not set. Run with `node -r dotenv/config scripts/checkCountsT47439k.js`');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const shop = 'T47439k';

    const totalCompleted = await FinalJob.countDocuments({ shop_id: shop, job_status: 'completed' });
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24 = await FinalJob.countDocuments({ shop_id: shop, job_status: 'completed', $or: [ { completed_at: { $gte: since24 } }, { createdAt: { $gte: since24 } } ] });

    // aggregate per calendar date
    const agg = await FinalJob.aggregate([
      { $match: { shop_id: shop, job_status: 'completed' } },
      { $project: { when: { $ifNull: ['$completed_at', '$createdAt'] } } },
      { $project: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$when' } } } },
      { $group: { _id: '$dateStr', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const shopDoc = await NewShop.findOne({ $or: [{ shop_id: shop }, { shopId: shop }] }).lean();

    const completedDocs = await FinalJob.find({ shop_id: shop, job_status: 'completed' }).sort({ createdAt: -1 }).lean();

    console.log('FinalJob totals for', shop);
    console.log('  totalCompleted:', totalCompleted);
    console.log('  last24:', last24);
    console.log('Per-calendar-day aggregation:');
    console.table(agg);

  console.log('\nNewShop.dailystats (embedded map):');
  console.log(shopDoc && shopDoc.dailystats ? shopDoc.dailystats : 'no dailystats');

    console.log('\nCompleted FinalJob documents:');
    for (const d of completedDocs) {
      console.log({ id: d._id.toString(), job_number: d.job_number, createdAt: d.createdAt, completed_at: d.completed_at });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
