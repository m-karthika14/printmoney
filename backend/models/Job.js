const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
  // Allow legacy string or newer object shape (name/email/etc.)
  customer: { type: mongoose.Schema.Types.Mixed, required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "newshops" },
    shop_id: { type: String, required: true },
  document_urls: [{ type: String }],
  // Full document metadata array (each item: { name, fileKey, url, mimeType, page_count, printed_pages, copies, ... })
  documents: { type: Array },
  // Rich print options including watermark and per-document overrides
  print_options: { type: Object, default: {} },
  // Optional top-level overrides present in newer payloads
  watermark: { type: Object },
  perDocOptions: { type: Array },
  total_amount: { type: Number },
  payment_status: { type: String, default: "pending" },
  payment_info: { type: Object },
    // Printer allocation pipeline status (pending -> alloted)
    printer_status: { type: String, default: 'pending' },
  job_status: { type: String, default: 'pending' },
    job_number: { type: String },
    collection_pin: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    queued_at: { type: Date },
    status: { type: String },
  files_processed: { type: Number },
  pages_printed: { type: Number },
  total_pages: { type: Number },
  total_printed_pages: { type: Number },
    agent_id: { type: String },
    processing_started_at: { type: Date },
    assigned_printer: { type: String },
    printer_assigned_at: { type: Date },
    current_file: { type: String },
    printing_started_at: { type: Date },
    completed_at: { type: Date },
    printed_by: { type: String },
    processing_time_seconds: { type: Number },
    queue_confirmed: { type: Boolean },
  },
  { timestamps: true }
);

// Helpful indexes for common queries
JobSchema.index({ shop_id: 1 });
JobSchema.index({ job_number: 1 });

// Sync limited fields to FinalJob after allotment (status + payment fields)
JobSchema.post('save', async function(doc) {
  try {
    if (!doc.job_number) return;
    const FinalJob = require('./FinalJob');
    const finalBefore = await FinalJob.findOne({ job_number: doc.job_number }).lean();
    // If job is not allotted and there's no FinalJob, nothing to do
    if (doc.printer_status !== 'alloted' && !finalBefore) return;

    const { buildFinalFromJob } = require('../utils/copyJobToFinal');
    // If there is already a FinalJob, just sync limited fields; otherwise create/upsert a full FinalJob
    if (finalBefore) {
      // Sync only allowed fields from Job -> FinalJob
      const payload = { job_status: doc.job_status };
      if (typeof doc.payment_status !== 'undefined') payload.payment_status = doc.payment_status;
      if (typeof doc.payment_info !== 'undefined') payload.payment_info = doc.payment_info;
      if (typeof doc.watermark !== 'undefined') payload.watermark = doc.watermark;
      if (typeof doc.perDocOptions !== 'undefined') payload.perDocOptions = doc.perDocOptions;
      await FinalJob.findOneAndUpdate(
        { job_number: doc.job_number },
        { $set: payload },
        { upsert: false, new: true, strict: false }
      );
    } else if (doc.printer_status === 'alloted') {
      // Create full FinalJob automatically when Job becomes allotted
      try {
        const sourceDoc = doc.toObject ? doc.toObject() : JSON.parse(JSON.stringify(doc));
        const finalBase = buildFinalFromJob(sourceDoc, null);
        // Merge allocation-specific fields from Job into FinalJob
        Object.assign(finalBase, {
          shop_id: doc.shop_id,
          printerid: doc.printerid || doc.printer_id || doc.assigned_printer || null,
          assigned_printer: doc.assigned_printer || null,
          printer_status: 'alloted',
          job_status: doc.job_status || 'pending',
          autoPrintMode: false,
          manualTriggered: false,
          printer_assigned_at: doc.printer_assigned_at || doc.queued_at || new Date()
        });
        await FinalJob.findOneAndUpdate({ job_number: doc.job_number }, { $set: finalBase }, { upsert: true, new: true, strict: false });
      } catch (e) {
        console.error('[Job hook] auto-create FinalJob failed:', e && e.message ? e.message : e);
      }
    }

    // If this update transitions the job into completed and FinalJob was not completed before,
    // increment NewShop daily + lifetime counters and revenue (mirrors logic in FinalJob route)
    if (doc.job_status === 'completed' && (!finalBefore || finalBefore.job_status !== 'completed')) {
      try {
        const NewShop = require('./NewShop');
  const { getIstDayKey } = require('../utils/ist');
  // Attribute daily counters to the actual completion timestamp (UTC).
  const completedDate = doc.completed_at || doc.updatedAt || doc.createdAt || new Date();
  const dayStr = getIstDayKey(completedDate);
  const sid = doc.shop_id || finalBefore?.shop_id;
        if (sid) {
          const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount))
            ? Number(doc.total_amount)
            : (typeof finalBefore?.total_amount === 'number' ? Number(finalBefore.total_amount) : 0);
          const incOps = { [`dailystats.${dayStr}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
          const setOps = { [`dailystats.${dayStr}.createdAt`]: new Date() };
          if (amount && amount > 0) {
            incOps[`totalRevenue.daily.${dayStr}.totalRevenue`] = amount;
            incOps.lifetimeRevenue = amount;
            setOps[`totalRevenue.daily.${dayStr}.createdAt`] = new Date();
          }
          await NewShop.updateOne(
            { shop_id: sid },
            { $inc: incOps, $set: setOps }
          );
        }
      } catch (e) {
        console.error('[Job hook] counters increment failed:', e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[Job model hook] dynamic sync to FinalJob failed:', e.message);
  }
});

// Also sync after findOneAndUpdate (when callers use it instead of save())
JobSchema.post('findOneAndUpdate', async function(doc) {
  try {
    if (!doc || !doc.job_number) return;
    const FinalJob = require('./FinalJob');
    const finalBefore = await FinalJob.findOne({ job_number: doc.job_number }).lean();
    if (doc.printer_status !== 'alloted' && !finalBefore) return;
    const { buildFinalFromJob } = require('../utils/copyJobToFinal');
    if (finalBefore) {
      // Sync only allowed fields
      const payload = { job_status: doc.job_status };
      if (typeof doc.payment_status !== 'undefined') payload.payment_status = doc.payment_status;
      if (typeof doc.payment_info !== 'undefined') payload.payment_info = doc.payment_info;
      if (typeof doc.watermark !== 'undefined') payload.watermark = doc.watermark;
      if (typeof doc.perDocOptions !== 'undefined') payload.perDocOptions = doc.perDocOptions;
      await FinalJob.findOneAndUpdate(
        { job_number: doc.job_number },
        { $set: payload },
        { upsert: false, new: true, strict: false }
      );
    } else if (doc.printer_status === 'alloted') {
      // Auto-create FinalJob on allotment
      try {
        const sourceDoc = doc.toObject ? doc.toObject() : JSON.parse(JSON.stringify(doc));
        const finalBase = buildFinalFromJob(sourceDoc, null);
        Object.assign(finalBase, {
          shop_id: doc.shop_id,
          printerid: doc.printerid || doc.printer_id || doc.assigned_printer || null,
          assigned_printer: doc.assigned_printer || null,
          printer_status: 'alloted',
          job_status: doc.job_status || 'pending',
          autoPrintMode: false,
          manualTriggered: false,
          printer_assigned_at: doc.printer_assigned_at || doc.queued_at || new Date()
        });
        await FinalJob.findOneAndUpdate({ job_number: doc.job_number }, { $set: finalBase }, { upsert: true, new: true, strict: false });
      } catch (e) {
        console.error('[Job hook findOneAndUpdate] auto-create FinalJob failed:', e && e.message ? e.message : e);
      }
    }

    if (doc.job_status === 'completed' && (!finalBefore || finalBefore.job_status !== 'completed')) {
      try {
        const NewShop = require('./NewShop');
  const { getIstDayKey } = require('../utils/ist');
  const completedDate = doc.completed_at || doc.updatedAt || doc.createdAt || new Date();
  const dayStr = getIstDayKey(completedDate);
  const sid = doc.shop_id || finalBefore?.shop_id;
        if (sid) {
          const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount))
            ? Number(doc.total_amount)
            : (typeof finalBefore?.total_amount === 'number' ? Number(finalBefore.total_amount) : 0);
          const incOps = { [`dailystats.${dayStr}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
          const setOps = { [`dailystats.${dayStr}.createdAt`]: new Date() };
          if (amount && amount > 0) {
            incOps[`totalRevenue.daily.${dayStr}.totalRevenue`] = amount;
            incOps.lifetimeRevenue = amount;
            setOps[`totalRevenue.daily.${dayStr}.createdAt`] = new Date();
          }
          await NewShop.updateOne(
            { shop_id: sid },
            { $inc: incOps, $set: setOps }
          );
        }
      } catch (e) {
        console.error('[Job hook findOneAndUpdate] counters increment failed:', e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[Job model hook] dynamic sync (findOneAndUpdate) failed:', e.message);
  }
});

// Also sync after updateOne (query middleware)
JobSchema.post('updateOne', { document: false, query: true }, async function(result) {
  try {
    const q = this.getQuery() || {};
    if (!q.job_number) return;
    const doc = await this.model.findOne({ job_number: q.job_number });
    if (!doc) return;
    const FinalJob = require('./FinalJob');
    const finalBefore = await FinalJob.findOne({ job_number: doc.job_number }).lean();
    if (doc.printer_status !== 'alloted' && !finalBefore) return;
    const { buildFinalFromJob } = require('../utils/copyJobToFinal');
    if (finalBefore) {
      // Sync only allowed fields
      const payload = { job_status: doc.job_status };
      if (typeof doc.payment_status !== 'undefined') payload.payment_status = doc.payment_status;
      if (typeof doc.payment_info !== 'undefined') payload.payment_info = doc.payment_info;
      if (typeof doc.watermark !== 'undefined') payload.watermark = doc.watermark;
      if (typeof doc.perDocOptions !== 'undefined') payload.perDocOptions = doc.perDocOptions;
      await FinalJob.findOneAndUpdate(
        { job_number: doc.job_number },
        { $set: payload },
        { upsert: false, new: true, strict: false }
      );
    } else if (doc.printer_status === 'alloted') {
      // Auto-create FinalJob on allotment
      try {
        const sourceDoc = doc.toObject ? doc.toObject() : JSON.parse(JSON.stringify(doc));
        const finalBase = buildFinalFromJob(sourceDoc, null);
        Object.assign(finalBase, {
          shop_id: doc.shop_id,
          printerid: doc.printerid || doc.printer_id || doc.assigned_printer || null,
          assigned_printer: doc.assigned_printer || null,
          printer_status: 'alloted',
          job_status: doc.job_status || 'pending',
          autoPrintMode: false,
          manualTriggered: false,
          printer_assigned_at: doc.printer_assigned_at || doc.queued_at || new Date()
        });
        await FinalJob.findOneAndUpdate({ job_number: doc.job_number }, { $set: finalBase }, { upsert: true, new: true, strict: false });
      } catch (e) {
        console.error('[Job hook updateOne] auto-create FinalJob failed:', e && e.message ? e.message : e);
      }
    }

    if (doc.job_status === 'completed' && (!finalBefore || finalBefore.job_status !== 'completed')) {
      try {
        const NewShop = require('./NewShop');
  const { getIstDayKey } = require('../utils/ist');
  const completedDate = doc.completed_at || doc.updatedAt || doc.createdAt || new Date();
  const dayStr = getIstDayKey(completedDate);
  const sid = doc.shop_id || finalBefore?.shop_id;
        if (sid) {
          const amount = (typeof doc.total_amount === 'number' && !Number.isNaN(doc.total_amount))
            ? Number(doc.total_amount)
            : (typeof finalBefore?.total_amount === 'number' ? Number(finalBefore.total_amount) : 0);
          const incOps = { [`dailystats.${dayStr}.totalJobsCompleted`]: 1, lifetimeJobsCompleted: 1 };
          const setOps = { [`dailystats.${dayStr}.createdAt`]: new Date() };
          if (amount && amount > 0) {
            incOps[`totalRevenue.daily.${dayStr}.totalRevenue`] = amount;
            incOps.lifetimeRevenue = amount;
            setOps[`totalRevenue.daily.${dayStr}.createdAt`] = new Date();
          }
          await NewShop.updateOne(
            { shop_id: sid },
            { $inc: incOps, $set: setOps }
          );
        }
      } catch (e) {
        console.error('[Job hook updateOne] counters increment failed:', e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[Job model hook] dynamic sync (updateOne) failed:', e.message);
  }
});

module.exports = mongoose.model("Job", JobSchema, "jobs");
