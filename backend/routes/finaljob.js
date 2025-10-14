const express = require('express');
const router = express.Router();
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');
const Job = require('../models/Job');

// Create a finalJob when shopkeeper assigns a printer
// Mark a job as alloted (printer_status) and ensure presence in FinalJobs
router.post('/assign', async (req, res) => {
  try {
    const { job_number, shop_id, printerid, assigned_printer } = req.body;
    if (!job_number || !shop_id || !printerid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const shop = await NewShop.findOne({ shopId: shop_id });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const autoPrintMode = !!shop.autoPrintMode;

    // Update Job.printer_status and keep job_status pending
    await Job.updateOne({ job_number }, { $set: { printer_status: 'alloted', job_status: 'pending' } });

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

    const update = { job_status };
    if (job_status === 'printing') update.printing_started_at = new Date();
    if (job_status === 'completed') update.completed_at = new Date();

    const job = await FinalJob.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Mirror status to Jobs (by job_number)
    await Job.updateOne({ job_number: job.job_number }, { $set: { job_status } });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
