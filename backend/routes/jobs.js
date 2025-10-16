const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const FinalJob = require('../models/FinalJob');

// GET /api/jobs/queue/:shop_id
// Merge jobs (source) and finaljobs (lifecycle) for a shop
router.get('/queue/:shop_id', async (req, res) => {
  try {
    const shopId = req.params.shop_id;
    if (!shopId) return res.status(400).json({ message: 'shop_id is required' });

    const [jobs, finals] = await Promise.all([
      Job.find({ shop_id: shopId }).lean(),
      FinalJob.find({ shop_id: shopId }).lean(),
    ]);

    const jobByNumber = new Map();
    for (const j of jobs) if (j.job_number) jobByNumber.set(j.job_number, j);

    const parseAmount = (v) => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    const merged = finals.map(f => {
      const j = jobByNumber.get(f.job_number) || {};
      const amt =
        parseAmount(f.total_amount) ??
        parseAmount(f.totalAmount) ??
        parseAmount(j.total_amount) ??
        parseAmount(j.totalAmount);
      return {
        finaljobId: String(f._id),
        job_number: f.job_number,
        job_status: f.job_status,
        autoPrintMode: !!f.autoPrintMode,
        manualTrigger: !!f.manualTriggered, // alias without schema change
        customer: j.customer || f.customer || '',
        payment_status: j.payment_status || f.payment_status || 'pending',
        createdAt: j.createdAt || f.createdAt,
        print_options: f.print_options || {},
        total_amount: amt,
      };
    });

  const printing = finals.filter(f => f.job_status === 'printing').length;
  const completed = finals.filter(f => f.job_status === 'completed').length;
    const total = jobs.length;
  // Derive shop auto mode from active jobs first, else fallback to most recent finaljob
  const active = finals.filter(f => f.job_status === 'pending' || f.job_status === 'printing');
  let autoMode = active.some(f => !!f.autoPrintMode);
  if (!autoMode && active.length === 0 && finals.length > 0) {
    const latest = [...finals].sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
    autoMode = !!latest?.autoPrintMode;
  }

    const order = { pending: 0, printing: 1, completed: 2 };
    merged.sort((a, b) => (order[a.job_status] ?? 99) - (order[b.job_status] ?? 99));

    res.json({
      shop_id: shopId,
      counts: { printing, completed, total },
      autoPrintMode: autoMode,
      jobs: merged,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
