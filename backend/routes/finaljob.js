const express = require('express');
const router = express.Router();
const FinalJob = require('../models/FinalJob');
const NewShop = require('../models/NewShop');

// Create a finalJob when shopkeeper assigns a printer
router.post('/assign', async (req, res) => {
  try {
    const { job_number, shop_id, printer_id } = req.body;
    if (!job_number || !shop_id || !printer_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Get shop's autoPrintMode
    const shop = await NewShop.findOne({ shopId: shop_id });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const autoPrintMode = shop.autoPrintMode || false;
    const finalJob = new FinalJob({
      job_number,
      shop_id,
      printer_id,
      autoPrintMode,
      manualTriggered: false,
      status: 'pending'
    });
    await finalJob.save();
    res.status(201).json(finalJob);
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
      status: 'pending',
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

// Update job status (processing, printing, ready)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'processing') update.printing_started_at = new Date();
    if (status === 'ready') update.completed_at = new Date();
    const job = await FinalJob.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
