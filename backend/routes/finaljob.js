const express = require('express');
const router = express.Router();
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');
const Job = require('../models/Job');

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
    const autoPrintMode = !!shop.autoPrintMode;
    // If a FinalJob already exists for this job_number, return it (idempotent)
    const existing = await FinalJob.findOne({ job_number }).lean();
    if (existing) {
      return res.status(200).json(existing);
    }

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

    const updated = await FinalJob.findOneAndUpdate(
      { job_number },
      {
        $set: {
          shop_id,
          printerid,
          assigned_printer: assigned_printer || '',
          printer_status: 'alloted',
          job_status: 'pending',
          autoPrintMode,
          manualTriggered: false
        }
      },
      { upsert: true, new: true }
    );
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
    // Increment today's dailystats only on transition into completed (prevent double-count)
    if (job_status === 'completed' && !wasCompleted && job.shop_id) {
      try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const dayStr = today.toISOString().slice(0,10);
        const setOps = {};
        setOps[`dailystats.${dayStr}.totalJobsCompleted`] = 1; // will use $inc
        setOps[`dailystats.${dayStr}.createdAt`] = new Date();
        await NewShop.updateOne(
          { shop_id: job.shop_id },
          {
            $inc: { [`dailystats.${dayStr}.totalJobsCompleted`]: 1 },
            $set: { [`dailystats.${dayStr}.createdAt`]: new Date() }
          },
          { upsert: false }
        );
      } catch (e) {
        console.error('[FINALJOB:status] dailystats increment failed:', e.message);
      }
    }
  // Socket removed: frontend uses polling
  res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

// Toggle autoPrintMode for all finaljobs in a shop (by canonical shop_id)
router.patch('/autoprint/:shop_id', async (req, res) => {
  try {
    const shopId = req.params.shop_id;
    const { autoPrintMode } = req.body || {};
    if (typeof autoPrintMode !== 'boolean') {
      return res.status(400).json({ message: 'autoPrintMode boolean is required' });
    }
    // When turning ON auto mode: also clear any manualTriggered flags (mutually exclusive)
    // When turning OFF auto mode: leave manualTriggered as-is (manual triggers can be set per job)
    const update = autoPrintMode ? { autoPrintMode: true, manualTriggered: false } : { autoPrintMode: false };
    const result = await FinalJob.updateMany(
      { shop_id: shopId },
      { $set: update }
    );
    res.json({ success: true, matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
