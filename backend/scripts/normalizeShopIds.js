/*
Normalize shop_id fields in jobs and finaljobs to the canonical NewShop.shopId string.

Why: Historically, some documents may have shop_id set to the Mongo ObjectId (_id) of the shop.
Now the system expects shop_id to be the canonical string (e.g., "T47439k").

Usage:
  DRY RUN (preview only):
    node scripts/normalizeShopIds.js --dry-run

  Live run (applies changes):
    node scripts/normalizeShopIds.js

Requirements:
  - Set MONGO_URI in environment or .env (same as backend/server.js)
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const NewShop = require('../models/NewShop');
const Job = require('../models/Job');
const FinalJob = require('../models/FinalJob');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run') || process.env.DRY_RUN === '1';

function isHex24(str) {
  return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str);
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set. Add it to your environment or .env file.');
    process.exit(1);
  }
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    // Ensure NewShop has shop_id populated (from legacy shopId if needed)
    const missing = await NewShop.updateMany(
      { shop_id: { $exists: false } },
      [{ $set: { shop_id: '$shopId' } }] // aggregation pipeline update
    );
    if (missing?.modifiedCount) {
      console.log(`Filled shop_id for ${missing.modifiedCount} shops from legacy shopId`);
    }

    const shops = await NewShop.find({}, { _id: 1, shopId: 1, shop_id: 1 }).lean();
    const idToCanonical = new Map(); // _id (string) -> shopId (string)
    for (const s of shops) {
      const key = String(s._id);
  idToCanonical.set(key, s.shop_id || s.shopId);
    }
    console.log(`Loaded ${shops.length} shops`);

    // Helper to build bulk updates for a collection
    const buildBulkOps = async (Model, collectionName) => {
      const ops = [];
      let totalCandidates = 0;
      for (const [objectIdStr, canonical] of idToCanonical.entries()) {
        // Count documents where shop_id equals the Mongo _id string
        const count = await Model.countDocuments({ shop_id: objectIdStr });
        if (count > 0) {
          totalCandidates += count;
          ops.push({
            updateMany: {
              filter: { shop_id: objectIdStr },
              update: { $set: { shop_id: canonical } }
            }
          });
        }
      }
      console.log(`[${collectionName}] docs to normalize: ${totalCandidates}`);
      if (DRY_RUN || ops.length === 0) return { matched: totalCandidates, modified: 0 };
      const res = await Model.bulkWrite(ops, { ordered: false });
      // res.result varies by driver version; use aggregated counts when available
      const modified = res.modifiedCount ?? res.result?.nModified ?? 0;
      const matched = res.matchedCount ?? res.result?.nMatched ?? totalCandidates;
      return { matched, modified };
    };

    const jobsRes = await buildBulkOps(Job, 'jobs');
    const finalsRes = await buildBulkOps(FinalJob, 'finaljobs');

    console.log('\nSummary:');
    console.log(`  jobs      - matched: ${jobsRes.matched}, modified: ${jobsRes.modified}${DRY_RUN ? ' (dry-run)' : ''}`);
    console.log(`  finaljobs - matched: ${finalsRes.matched}, modified: ${finalsRes.modified}${DRY_RUN ? ' (dry-run)' : ''}`);

    if (DRY_RUN) {
      console.log('\nDry run complete. Re-run without --dry-run to apply changes.');
    } else {
      console.log('\nNormalization complete.');
    }
  } catch (err) {
    console.error('Error during normalization:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
