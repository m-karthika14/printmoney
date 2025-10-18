const mongoose = require('mongoose');
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

async function fixShop(shopId) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set. Run with `node -r dotenv/config scripts/fixDailystatsForShop.js SHOPID`');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Aggregate completed counts per calendar date for this shop
  const agg = await FinalJob.aggregate([
    { $match: { shop_id: shopId, job_status: 'completed' } },
    { $project: { when: { $ifNull: ['$completed_at', '$createdAt'] } } },
    { $project: { dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$when' } } } },
    { $group: { _id: '$dateStr', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  console.log(`[fixDailystatsForShop] shop=${shopId} aggregated ${agg.length} date buckets`);

  // For each aggregated entry, upsert the correct value into NewShop.dailystats
  for (const row of agg) {
    const date = row._id;
    const count = row.count;
    await NewShop.updateOne(
      { $or: [{ shop_id: shopId }, { shopId: shopId }] },
      { $set: { [`dailystats.${date}.totalJobsCompleted`]: count, [`dailystats.${date}.createdAt`]: new Date() } }
    );
    console.log(`  upserted ${shopId} ${date} -> ${count}`);
  }

  // Also remove any dailystats entries for dates not present in aggregation (optional): keep as is to avoid data loss

  await mongoose.disconnect();
}

if (require.main === module) {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Usage: node -r dotenv/config scripts/fixDailystatsForShop.js SHOPID');
    process.exit(1);
  }
  fixShop(shopId).then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1)});
}

module.exports = { fixShop };
