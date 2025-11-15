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

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Use Job collection to compute rolling last-24h totals (jobs created in last 24h)
    const [jobs, finals, total24hr] = await Promise.all([
      Job.find({ shop_id: shopId }).lean(),
      FinalJob.find({ shop_id: shopId }).lean(),
      Job.countDocuments({ shop_id: shopId, createdAt: { $gte: since } })
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
      const pages =
        (typeof f.total_pages === 'number' ? f.total_pages : (typeof f.totalPages === 'number' ? f.totalPages : undefined)) ??
        (typeof j.total_pages === 'number' ? j.total_pages : (typeof j.totalPages === 'number' ? j.totalPages : undefined));
      const printed =
        (typeof f.total_printed_pages === 'number' ? f.total_printed_pages : (typeof f.totalPrintedPages === 'number' ? f.totalPrintedPages : undefined)) ??
        (typeof j.total_printed_pages === 'number' ? j.total_printed_pages : (typeof j.totalPrintedPages === 'number' ? j.totalPrintedPages : undefined));
      return {
        finaljobId: String(f._id),
        job_number: f.job_number,
        job_status: f.job_status,
        autoPrintMode: !!f.autoPrintMode,
        manualTrigger: !!f.manualTriggered, // alias without schema change
        customer: j.customer || f.customer || '',
        payment_status: j.payment_status || f.payment_status || 'pending',
        createdAt: j.createdAt || f.createdAt,
        updatedAt: f.updatedAt,
        completed_at: f.completed_at,
        current_file: f.current_file,
        document_urls: j.document_urls || f.document_urls || [],
        print_options: f.print_options || {},
        total_amount: amt,
  // Default numeric fields to 0 when not present so frontend can render 0 instead of "—"
  total_pages: typeof pages === 'number' ? pages : 0,
  total_printed_pages: typeof printed === 'number' ? printed : 0,
        // collected flag and timestamp
        collected: !!f.collected,
        collectedAt: f.collectedAt || null,
      };
    });

  const printing = finals.filter(f => f.job_status === 'printing').length;
  const completed = finals.filter(f => f.job_status === 'completed').length;
    const total = jobs.length;
  // Derive shop auto mode from active FinalJob documents first, else fallback
  // to the most recent finaljob's value.
  const active = finals.filter(f => f.job_status === 'pending' || f.job_status === 'printing');
  let autoMode = active.some(f => !!f.autoPrintMode);
  if (!autoMode && active.length === 0 && finals.length > 0) {
    const latest = [...finals].sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
    autoMode = !!latest?.autoPrintMode;
  }

    // New ordering per UI request:
    // 1) first-arrived pending jobs
    // 2) printing jobs
    // 3) completed (printed but not yet collected)
    // 4) collected jobs (always at the end)
    const groupOrder = (item) => {
      if (item.collected) return 3;
      if (item.job_status === 'pending') return 0;
      if (item.job_status === 'printing') return 1;
      if (item.job_status === 'completed') return 2;
      return 99;
    };

    // Sort primarily by groupOrder, secondarily by arrival time (createdAt ascending)
    merged.sort((a, b) => {
      const ga = groupOrder(a);
      const gb = groupOrder(b);
      if (ga !== gb) return ga - gb;
      const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return ta - tb;
    });

    res.json({
      shop_id: shopId,
      counts: { printing, completed, total, total24hr },
      autoPrintMode: autoMode,
      jobs: merged,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
// Total jobs for a shop (Job collection only)
// GET /api/jobs/total/:shop_id?last24=true
router.get('/total/:shop_id', async (req, res) => {
  try {
    const shopId = req.params.shop_id;
    if (!shopId) return res.status(400).json({ message: 'shop_id is required' });

    const last24 = req.query.last24 === 'true' || req.query.last24 === '1';
    if (last24) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const total = await Job.countDocuments({ shop_id: shopId, createdAt: { $gte: since } });
      return res.json({ shop_id: shopId, totalJobs: total });
    }

    // Default: count current Job documents (active queue)
    const total = await Job.countDocuments({ shop_id: shopId });
    res.json({ shop_id: shopId, totalJobs: total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
