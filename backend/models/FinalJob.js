const mongoose = require('mongoose');

const FinalJobSchema = new mongoose.Schema({
  job_number: { type: String, required: true },
  // Mirror from Job: allow string or object
  customer: { type: mongoose.Schema.Types.Mixed },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'newshops' },
  shop_id: { type: String },
  document_urls: [{ type: String }],
  print_options: { type: Object, default: {} },
  total_amount: { type: Number },
  payment_status: { type: String },
  payment_info: { type: Object },
  // Added explicit watermark + perDocOptions (present in Job payloads)
  watermark: { type: Object },
  perDocumentWatermarks: { type: Array },
  job_status: {
    type: String,
    enum: ['pending', 'printing', 'completed'],
    default: 'pending'
  },
  // Allocation status on the printer pipeline
  printer_status: { type: String, enum: ['pending', 'alloted'], default: 'alloted' },
  collection_pin: { type: String },
  queued_at: { type: Date },
  processing_started_at: { type: Date },
  printing_started_at: { type: Date },
  completed_at: { type: Date },
  printer_assigned_at: { type: Date },
  assigned_printer: { type: String },
  // Unique printer identifier from newshops.printers
  printerid: { type: String },
  // Final effective printer configuration (agentDetected or manualOverride based on useAgentValues)
  printer_config: { type: Object },
  agent_id: { type: String },
  status: { type: String },
  files_processed: { type: Number },
  pages_printed: { type: Number },
  current_file: { type: String },
  printed_by: { type: String },
  processing_time_seconds: { type: Number },
  queue_confirmed: { type: Boolean },
  manualTriggered: { type: Boolean, default: false },
  autoPrintMode: { type: Boolean },
  // Total pages in the job and how many pages actually printed
  totalpages: { type: Number, default: 0 },
  totalpagesprinted: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

// Update updated_at on every save
FinalJobSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Helpful indexes for common queries
FinalJobSchema.index({ shop_id: 1, job_status: 1 });
FinalJobSchema.index({ job_number: 1 });

// Utility: increment NewShop daily + lifetime counters on first transition to completed
async function incrementShopCounters(doc) {
  try {
    if (!doc || doc.job_status !== 'completed' || doc.dailyIncrementDone === true) return;
    const prevStatus = doc._prevStatus; // set by pre hooks
    if (prevStatus === 'completed') return; // already completed earlier
    const NewShop = require('./NewShop');
  const { getIstDayKey } = require('../utils/ist');
  // Use the job's completion timestamp if available so the counters are attributed
  // to the actual completion date (UTC). Fall back to updatedAt/createdAt or now.
  const completedDate = doc.completed_at || doc.updatedAt || doc.createdAt || new Date();
  const dayStr = getIstDayKey(completedDate);
    const sid = doc.shop_id;
    if (!sid) return;
    const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount)) ? Number(doc.total_amount) : 0;
    const incOps = { [`dailystats.${dayStr}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
    const setOps = { [`dailystats.${dayStr}.createdAt`]: new Date() };
    if (amount > 0) {
      incOps[`totalRevenue.daily.${dayStr}.totalRevenue`] = amount;
      incOps.lifetimeRevenue = amount;
      setOps[`totalRevenue.daily.${dayStr}.createdAt`] = new Date();
    }
    await NewShop.updateOne({ shop_id: sid }, { $inc: incOps, $set: setOps });
    // Mark flag to avoid double counting on subsequent hooks
    await mongoose.model('FinalJob').updateOne({ _id: doc._id }, { $set: { dailyIncrementDone: true } });
  } catch (e) {
    console.error('[FinalJob hook] increment counters failed:', e && e.message ? e.message : e);
  }
}

// Track previous status for query updates
FinalJobSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const q = this.getQuery() || {};
    const prev = await this.model.findOne(q).select({ job_status: 1 }).lean();
    if (prev) this._prevStatus = prev.job_status;
  } catch {}
  next();
});

FinalJobSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  doc._prevStatus = this._prevStatus;
  await incrementShopCounters(doc);
});

FinalJobSchema.post('save', async function(doc) {
  try {
    if (!doc) return;
    doc._prevStatus = doc.isNew ? 'pending' : undefined; // conservative default
    await incrementShopCounters(doc);
  } catch {}
});

// Ensure updates done via updateOne (query middleware) also trigger increment logic
FinalJobSchema.pre('updateOne', { document: false, query: true }, async function(next) {
  try {
    const q = this.getQuery() || {};
    // capture previous status for the document(s) being updated (best-effort)
    const prev = await this.model.findOne(q).select({ job_status: 1 }).lean();
    if (prev) this._prevStatus = prev.job_status;
  } catch (e) {}
  next();
});

FinalJobSchema.post('updateOne', { document: false, query: true }, async function(result) {
  try {
    const q = this.getQuery() || {};
    // Find the updated document (post-update)
    const doc = await this.model.findOne(q);
    if (!doc) return;
    // Attach captured prev status so incrementShopCounters can check transitions
    if (typeof this._prevStatus !== 'undefined') doc._prevStatus = this._prevStatus;
    await incrementShopCounters(doc);
  } catch (e) {
    console.error('[FinalJob hook updateOne] increment counters failed:', e && e.message ? e.message : e);
  }
});

// When documents are inserted in bulk (insertMany) the normal 'save' hooks do not run.
// Ensure any inserted docs that are already completed get their counters incremented.
FinalJobSchema.post('insertMany', async function(docs) {
  try {
    if (!Array.isArray(docs) || docs.length === 0) return;
    for (const d of docs) {
      try {
        if (d && d.job_status === 'completed' && !d.dailyIncrementDone) {
          // call increment logic (pass the plain doc)
          await incrementShopCounters(d);
        }
      } catch (e) {
        console.error('[FinalJob insertMany hook] failed for doc', d && d._id, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[FinalJob insertMany hook] error:', e && e.message ? e.message : e);
  }
});

// For updateMany bulk operations, capture post-update state and apply increments
FinalJobSchema.post('updateMany', { document: false, query: true }, async function(result) {
  try {
    const q = this.getQuery() || {};
    // Find documents that are now completed but not yet incremented
    const docs = await this.model.find(Object.assign({}, q, { job_status: 'completed', $or: [{ dailyIncrementDone: { $exists: false } }, { dailyIncrementDone: false }] }));
    for (const doc of docs) {
      try {
        await incrementShopCounters(doc);
      } catch (e) {
        console.error('[FinalJob updateMany hook] increment failed for', doc._id, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[FinalJob updateMany hook] error:', e && e.message ? e.message : e);
  }
});

module.exports = mongoose.model('FinalJob', FinalJobSchema);
