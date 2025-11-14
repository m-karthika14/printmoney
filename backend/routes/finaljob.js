const express = require('express');
const router = express.Router();
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');
const Job = require('../models/Job');
let getIOSafe = null;
try { getIOSafe = require('../socket').getIO; } catch {}

// Create a finalJob when shopkeeper assigns a printer
// Mark a job as alloted (printer_status) and ensure presence in FinalJobs
router.post('/assign', async (req, res) => {
  try {
    let { job_number, shop_id, printerid, assigned_printer } = req.body;
    if (!job_number || !shop_id || !printerid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Require canonical shopId form for consistency
  const shop = await NewShop.findOne({ shop_id: shop_id });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    // Default new FinalJob to manual mode; autoPrintMode is stored per-FinalJob
    const autoPrintMode = false;
    // If a FinalJob already exists for this job_number, we'll update it below instead of returning early.

    // Prevent assigning to a printer that already has an active job
    const orClauses = [{ printerid }, { assigned_printer: printerid }];
    if (assigned_printer) {
      orClauses.push({ assigned_printer });
      orClauses.push({ printerid: assigned_printer });
    }
  const busy = await FinalJob.findOne({ shop_id, $or: orClauses, job_status: { $ne: 'completed' } }).lean();
    if (busy) {
      return res.status(409).json({ message: 'Printer already has an active job', busyJob: busy.job_number });
    }

    // Atomically claim the Job (only if still pending) to avoid races
    const claimed = await Job.findOneAndUpdate(
      { job_number, printer_status: 'pending' },
      { $set: { printer_status: 'alloted', job_status: 'pending' } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ message: 'Job already claimed or not in pending state' });
    }

    // IMPORTANT: fetch the authoritative Job document as a plain object (includes unknown/new fields)
    // Using lean() ensures we don't lose fields not declared in the Mongoose schema.
  const jobRaw = await Job.findOne({ job_number }).lean();
  const sourceDoc = jobRaw || claimed; // fallback to claimed if lean fetch fails (shouldn't normally)
  // If a FinalJob exists already, we'll preserve specific Final-only fields from it
  const existingFinal = await FinalJob.findOne({ job_number }).lean();

    // Copy all Job fields dynamically into FinalJob from the raw document
  const { buildFinalFromJob } = require('../utils/copyJobToFinal');
  const finalBase = buildFinalFromJob(sourceDoc, existingFinal);
  // Ensure critical fields from Job are present even if schema evolves
  if (typeof sourceDoc.payment_status !== 'undefined') finalBase.payment_status = sourceDoc.payment_status;
  if (typeof sourceDoc.payment_info !== 'undefined') finalBase.payment_info = sourceDoc.payment_info;
    if (typeof sourceDoc.watermark !== 'undefined') finalBase.watermark = sourceDoc.watermark;
    // Ensure per-document watermark arrays are copied into both common field names
    if (sourceDoc.watermark && Array.isArray(sourceDoc.watermark.perDocument)) {
      finalBase.perDocumentWatermarks = sourceDoc.watermark.perDocument;
      finalBase.perDocOptions = sourceDoc.watermark.perDocument;
    }
    if (typeof sourceDoc.perDocument !== 'undefined') {
      finalBase.perDocumentWatermarks = sourceDoc.perDocument;
      finalBase.perDocOptions = sourceDoc.perDocument;
    }
    if (typeof sourceDoc.perDocumentWatermarks !== 'undefined') finalBase.perDocumentWatermarks = sourceDoc.perDocumentWatermarks;
    if (typeof sourceDoc.perDocOptions !== 'undefined') finalBase.perDocOptions = sourceDoc.perDocOptions;
    // Merge allocation-specific fields / overrides
    Object.assign(finalBase, {
      shop_id,
      printerid,
      assigned_printer: assigned_printer || '',
      printer_status: 'alloted',
      job_status: 'pending',
      autoPrintMode,
      manualTriggered: false
    });
    // Always upsert/update full mirror of Job fields (except Final-only fields preserved separately)
    const updated = await FinalJob.findOneAndUpdate(
      { job_number },
      { $set: finalBase },
      { upsert: true, new: true, strict: false }
    );
    // Emit live counts for the shop (pending/printing/completed)
    try {
      if (getIOSafe && updated && updated.shop_id) {
        const sid = updated.shop_id;
        const [pending, printing, completed] = await Promise.all([
          FinalJob.countDocuments({ shop_id: sid, job_status: 'pending' }),
          FinalJob.countDocuments({ shop_id: sid, job_status: 'printing' }),
          FinalJob.countDocuments({ shop_id: sid, job_status: 'completed' })
        ]);
        getIOSafe().to(`shop:${sid}`).emit('counts', { pending, printing, completed });
      }
    } catch (e) { /* ignore socket errors */ }

    res.status(201).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update manualTriggered (shopkeeper triggers manual print)
router.patch('/:id/manual-trigger', async (req, res) => {
  try {
    const job = await FinalJob.findByIdAndUpdate(
      req.params.id,
      { manualTriggered: true },
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Agent fetch: get jobs to print
router.get('/agent-fetch', async (req, res) => {
  try {
    const jobs = await FinalJob.find({
      job_status: 'pending',
      $or: [
        { autoPrintMode: true },
        { manualTriggered: true }
      ]
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Summary: how many jobs are allotted per printer (optionally filter by shopId)
router.get('/summary/printer-allocations', async (req, res) => {
  try {
    const { shopId, includeCompleted } = req.query;
    const match = {};
    if (shopId) match.shop_id = shopId;
    if (!includeCompleted || includeCompleted === 'false') {
      // Focus on active work by default
      match.job_status = { $in: ['pending', 'printing'] };
    }
    match.printerid = { $ne: null };

    const rows = await FinalJob.aggregate([
      { $match: match },
      {
        $group: {
          _id: { shop_id: '$shop_id', printerid: '$printerid' },
          assigned_printer: { $first: '$assigned_printer' },
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$job_status', 'pending'] }, 1, 0] } },
          printing: { $sum: { $cond: [{ $eq: ['$job_status', 'printing'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$job_status', 'completed'] }, 1, 0] } },
          jobs: { $push: '$job_number' }
        }
      },
      { $sort: { 'total': -1 } }
    ]);

    const result = rows.map(r => ({
      shop_id: r._id.shop_id,
      printerid: r._id.printerid,
      assigned_printer: r.assigned_printer,
      total: r.total,
      pending: r.pending,
      printing: r.printing,
      completed: r.completed,
      job_numbers: r.jobs
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update job status in both FinalJob and Job: pending -> printing -> completed
router.patch('/:id/status', async (req, res) => {
  try {
    const { job_status } = req.body; // 'pending' | 'printing' | 'completed'
    if (!['pending', 'printing', 'completed'].includes(job_status)) {
      return res.status(400).json({ message: 'Invalid job_status' });
    }

    // Fetch previous to detect state transition
    const prev = await FinalJob.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ message: 'Job not found' });
    const wasCompleted = prev.job_status === 'completed';

    const update = { job_status };
    if (job_status === 'printing') update.printing_started_at = new Date();
    if (job_status === 'completed') update.completed_at = new Date();

  const job = await FinalJob.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Mirror status to Jobs (by job_number)
    await Job.updateOne({ job_number: job.job_number }, { $set: { job_status } });

    // If the job completed and the printer was pending_off, flip it to off now
    if (job_status === 'completed' && job.shop_id && (job.printerid || job.assigned_printer)) {
      try {
  const shop = await NewShop.findOne({ shop_id: job.shop_id });
        if (shop) {
          const pid = job.printerid || job.assigned_printer;
          let printer = (shop.printers || []).find(p => (p.printerid || p.printerId) === pid);
          if (!printer) {
            // attempt to match by agentDetected.name
            printer = (shop.printers || []).find(p => p.agentDetected?.name === pid);
          }
          if (printer && printer.manualStatus === 'pending_off') {
            printer.manualStatus = 'off';
            await shop.save();
          }
        }
      } catch (e) {
        console.error('[FINALJOB:status] post-complete manualStatus flip failed:', e.message);
      }
    }
    // Increment today's dailystats and lifetime counters only on transition into completed (use IST)
    if (job_status === 'completed' && !wasCompleted && job.shop_id) {
      try {
        const { getIstDayKey } = require('../utils/ist');
        // Attribute the snapshot to the job's completed timestamp (UTC) when available.
        const completedDate = job.completed_at || job.updatedAt || job.createdAt || new Date();
        const dayStr = getIstDayKey(completedDate);

        // Fetch the shop doc so we can use Map get/set (ensures proper creation of nested subdocs)
        const shopDoc = await NewShop.findOne({ shop_id: job.shop_id });
        if (shopDoc) {
          // Ensure Map instances exist
          if (!shopDoc.dailystats) shopDoc.dailystats = new Map();

          const todayStats = shopDoc.dailystats.get(dayStr) || { totalJobsCompleted: 0, createdAt: new Date() };
          todayStats.totalJobsCompleted += 1;
          shopDoc.dailystats.set(dayStr, todayStats);

          // Lifetime counters
          shopDoc.lifetimeJobsCompleted = (shopDoc.lifetimeJobsCompleted || 0) + 1;

          // Revenue increment (if present)
          const revenueInc = (typeof job.total_amount === 'number' && !Number.isNaN(job.total_amount))
            ? Number(job.total_amount)
            : (typeof job.totalAmount === 'number' && !Number.isNaN(job.totalAmount))
              ? Number(job.totalAmount)
              : 0;

          if (revenueInc > 0) {
            // Ensure revenue maps exist
            if (!shopDoc.totalRevenue) shopDoc.totalRevenue = {};
            if (!shopDoc.totalRevenue.daily) shopDoc.totalRevenue.daily = new Map();
            const revStats = shopDoc.totalRevenue.daily.get(dayStr) || { totalRevenue: 0, createdAt: new Date() };
            revStats.totalRevenue += revenueInc;
            shopDoc.totalRevenue.daily.set(dayStr, revStats);
            shopDoc.lifetimeRevenue = (shopDoc.lifetimeRevenue || 0) + revenueInc;
          }

          await shopDoc.save();
        }
      } catch (e) {
        console.error('[FINALJOB:status] dailystats/lifetime increment failed:', e && e.message ? e.message : e);
      }
    }
    // Push real-time updates via socket (if available)
    try {
      if (getIOSafe && job && job.shop_id) {
        const sid = job.shop_id;
        const [pending, printing, completed] = await Promise.all([
          FinalJob.countDocuments({ shop_id: sid, job_status: 'pending' }),
          FinalJob.countDocuments({ shop_id: sid, job_status: 'printing' }),
          FinalJob.countDocuments({ shop_id: sid, job_status: 'completed' })
        ]);
        const io = getIOSafe();
        io.to(`shop:${sid}`).emit('counts', { pending, printing, completed });
        io.to(`shop:${sid}`).emit('finaljob:update', { job_number: job.job_number, job_status: job.job_status, total_amount: job.total_amount, payment_status: job.payment_status });
      }
    } catch (e) { /* ignore socket errors */ }
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// Resync FinalJob with latest fields from Job (idempotent)
// POST /api/finaljobs/resync/:job_number
router.post('/resync/:job_number', async (req, res) => {
  try {
    const job_number = req.params.job_number;
    const job = await Job.findOne({ job_number });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const final = await FinalJob.findOne({ job_number });
    if (!final) return res.status(404).json({ message: 'FinalJob not found' });
    // Sync allowed fields on resync
    const payload = { job_status: job.job_status };
    if (typeof job.payment_status !== 'undefined') payload.payment_status = job.payment_status;
    if (typeof job.payment_info !== 'undefined') payload.payment_info = job.payment_info;
    if (typeof job.watermark !== 'undefined') payload.watermark = job.watermark;
    // copy per-document watermark arrays into both field names
    if (job.watermark && Array.isArray(job.watermark.perDocument)) {
      payload.perDocumentWatermarks = job.watermark.perDocument;
      payload.perDocOptions = job.watermark.perDocument;
    }
    if (typeof job.perDocument !== 'undefined') {
      payload.perDocumentWatermarks = job.perDocument;
      payload.perDocOptions = job.perDocument;
    }
    if (typeof job.perDocumentWatermarks !== 'undefined') payload.perDocumentWatermarks = job.perDocumentWatermarks;
    if (typeof job.perDocOptions !== 'undefined') payload.perDocOptions = job.perDocOptions;
    const updated = await FinalJob.findOneAndUpdate(
      { job_number },
      { $set: payload },
      { new: true, strict: false }
    );
    res.json({ success: true, job_number, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk resync helper: copy selected fields from Job -> FinalJob when missing or override requested
// POST /api/finaljobs/resync-missing
// body: { shop_id?: string, fields?: string[], override?: boolean, limit?: number }
router.post('/resync-missing', async (req, res) => {
  try {
    const { shop_id, fields, override, limit } = req.body || {};
    const allow = new Set((Array.isArray(fields) && fields.length ? fields : ['payment_status','payment_info','watermark','perDocOptions']).map(String));
    const lim = Math.min(500, Math.max(1, Number(limit) || 200));
    const match = {};
    if (shop_id) match.shop_id = shop_id;
    const finals = await FinalJob.find(match).select({ job_number: 1, shop_id: 1, payment_status: 1, payment_info: 1, watermark: 1, perDocOptions: 1 }).limit(lim).lean();
    let updated = 0;
    for (const f of finals) {
      if (!f.job_number) continue;
      const j = await Job.findOne({ job_number: f.job_number }).select({ payment_status: 1, payment_info: 1, watermark: 1, perDocOptions: 1 }).lean();
      if (!j) continue;
      const payload = {};
      if (allow.has('payment_status') && typeof j.payment_status !== 'undefined' && (override || typeof f.payment_status === 'undefined')) payload.payment_status = j.payment_status;
      if (allow.has('payment_info') && typeof j.payment_info !== 'undefined' && (override || typeof f.payment_info === 'undefined')) payload.payment_info = j.payment_info;
      if (allow.has('watermark') && typeof j.watermark !== 'undefined' && (override || typeof f.watermark === 'undefined')) payload.watermark = j.watermark;
      // copy per-document watermark arrays into both field names when present on Job
      if (allow.has('perDocOptions')) {
        if (j.watermark && Array.isArray(j.watermark.perDocument) && (override || typeof f.perDocOptions === 'undefined')) payload.perDocOptions = j.watermark.perDocument;
        if (j.watermark && Array.isArray(j.watermark.perDocument) && (override || typeof f.perDocumentWatermarks === 'undefined')) payload.perDocumentWatermarks = j.watermark.perDocument;
        if (typeof j.perDocument !== 'undefined' && (override || typeof f.perDocOptions === 'undefined')) payload.perDocOptions = j.perDocument;
        if (typeof j.perDocument !== 'undefined' && (override || typeof f.perDocumentWatermarks === 'undefined')) payload.perDocumentWatermarks = j.perDocument;
        if (typeof j.perDocOptions !== 'undefined' && (override || typeof f.perDocOptions === 'undefined')) payload.perDocOptions = j.perDocOptions;
        if (typeof j.perDocumentWatermarks !== 'undefined' && (override || typeof f.perDocumentWatermarks === 'undefined')) payload.perDocumentWatermarks = j.perDocumentWatermarks;
      }
      if (Object.keys(payload).length === 0) continue;
      await FinalJob.updateOne({ job_number: f.job_number }, { $set: payload }, { strict: false });
      updated++;
    }
    res.json({ success: true, count: finals.length, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle autoPrintMode for all finaljobs in a shop (by canonical shop_id)
router.patch('/autoprint/:shop_id', async (req, res) => {
  try {
    const shopId = req.params.shop_id;
    const { autoPrintMode } = req.body || {};
    if (typeof autoPrintMode !== 'boolean') {
      return res.status(400).json({ message: 'autoPrintMode boolean is required' });
    }
    // Update FinalJob documents for this shop to reflect the chosen mode.
    // When enabling auto, clear manualTriggered (mutually exclusive). When
    // disabling auto, leave manualTriggered as-is.
    const update = autoPrintMode ? { autoPrintMode: true, manualTriggered: false } : { autoPrintMode: false };
    const result = await FinalJob.updateMany(
      { shop_id: shopId },
      { $set: update }
    );

    // Return the authoritative value that was applied to FinalJob docs.
    res.json({ success: true, matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified, autoPrintMode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// (Removed) sync-autoprint admin endpoint; autoPrintMode is stored on FinalJob documents.

// Manual print trigger (frontend uses manualTrigger; map to manualTriggered without schema change)
router.patch('/:id/manual', async (req, res) => {
  try {
    const { manualTrigger } = req.body || {};
    if (typeof manualTrigger !== 'boolean') {
      return res.status(400).json({ message: 'manualTrigger boolean is required' });
    }
    const job = await FinalJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Enforce mutual exclusivity
    if (manualTrigger === true) {
      // Manual print can only be triggered when auto mode is OFF
      if (job.autoPrintMode) {
        return res.status(400).json({ message: 'Cannot trigger manual print in auto mode' });
      }
      job.manualTriggered = true;
      job.autoPrintMode = false; // ensure exclusivity at the job level
    } else {
      job.manualTriggered = false;
      // Do not auto-enable autoPrintMode here; leave as-is
    }
    await job.save();
  // Socket removed: frontend uses polling
    // Return alias field for frontend convenience
    const obj = job.toObject();
    obj.manualTrigger = !!obj.manualTriggered;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a FinalJob as collected by the customer. This can be performed only once per job.
// PATCH /api/finaljobs/:id/collect
router.patch('/:id/collect', async (req, res) => {
  try {
    const id = req.params.id;
    // Attempt an atomic update only if not already collected
    const updated = await FinalJob.findOneAndUpdate(
      { _id: id, collected: { $ne: true } },
      { $set: { collected: true, collectedAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      // Either not found or already collected
      const exists = await FinalJob.findById(id).lean();
      if (!exists) return res.status(404).json({ message: 'FinalJob not found' });
      return res.status(409).json({ message: 'Job already marked as collected' });
    }
    // Return the updated document
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
