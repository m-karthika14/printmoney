const Job = require('./models/Job');
const FinalJob = require('./models/FinalJob');
const NewShop = require('./models/NewShop');

function jobRequiresColor(printOptions) {
  const pt = (printOptions?.printType || '').toString().toLowerCase();
  return pt === 'color' || pt === 'colour';
}

function jobRequiresDuplex(printOptions) {
  const dp = (printOptions?.duplex || '').toString().toLowerCase();
  return dp === 'double' || dp === 'duplex';
}

function matchesPrinter(job, printer) {
  if (!printer || printer.status !== 'online') return false;
  if (printer.manualStatus === 'off' || printer.manualStatus === 'pending_off') return false; // respect shopkeeper toggle & pending
  const source = printer.useAgentValues ? printer.agentDetected : printer.manualOverride;
  if (!source || !Array.isArray(source.capabilities) || source.capabilities.length === 0) return false;
  const needColor = jobRequiresColor(job.print_options || {});
  const needDuplex = jobRequiresDuplex(job.print_options || {});
  const requiredSize = job.print_options?.paperSize;

  // Capabilities may contain multiple entries; accept if any capability satisfies requirements
  const capsArray = Array.isArray(source.capabilities) ? source.capabilities : [];
  for (const caps of capsArray) {
    const typeOk = needColor ? (String(caps.type).toLowerCase().includes('color')) : true;
    const duplexOk = needDuplex ? !!caps.duplex : true;
    const sizeOk = requiredSize ? (Array.isArray(caps.paperSizes) && caps.paperSizes.includes(requiredSize)) : true;
    if (typeOk && duplexOk && sizeOk) return true;
  }
  return false;
}

async function pollJobsAndAssignPrinters(shopIdFilter) {
  console.log('[JobPoller] Polling jobs collection for pending jobs...');
  const query = { printer_status: 'pending' };
  if (shopIdFilter) query.shop_id = shopIdFilter;
  const pendingJobs = await Job.find(query);
  console.log(`[JobPoller] Found ${pendingJobs.length} pending jobs.`);
  for (const job of pendingJobs) {
    // Idempotency: if already in finaljobs, skip (by job_number)
    const exists = await FinalJob.findOne({ job_number: job.job_number });
    if (exists) {
      console.log(`[JobPoller] Job ${job.job_number} already present in finaljobs, marking alloted and skipping.`);
      await Job.updateOne({ _id: job._id }, { $set: { printer_status: 'alloted' } });
      continue;
    }

  const shop = await NewShop.findOne({ $or: [{ shop_id: job.shop_id }, { shopId: job.shop_id }] });
    if (!shop || !Array.isArray(shop.printers) || shop.printers.length === 0) {
      console.log(`[JobPoller] No printers for shop ${job.shop_id} — skip job ${job.job_number}.`);
      continue;
    }

    const candidates = shop.printers.filter(p => matchesPrinter(job, p));
    if (candidates.length === 0) {
      console.warn(`[JobPoller] No compatible printer for job ${job.job_number} in shop ${job.shop_id}.`);
      continue;
    }

    // One-active-job-per-printer: filter out printers with active finaljobs
    let selected = null;
    for (const cand of candidates) {
      const pid = cand.printerid || cand.printerId;
      const pname = (cand.agentDetected && cand.agentDetected.name) || (cand.manualOverride && cand.manualOverride.name);

      // Build OR clauses only for truthy identifiers
      const orClauses = [];
      if (pid) {
        orClauses.push({ printerid: pid });
        orClauses.push({ assigned_printer: pid });
      }
      if (pname) {
        orClauses.push({ assigned_printer: pname });
        orClauses.push({ printerid: pname });
      }

      // If we don't have any identifier to check against, be conservative and treat as busy
      if (orClauses.length === 0) {
        console.warn(`[JobPoller] Printer ${JSON.stringify(cand)} has no id or name; treating as busy to avoid duplicate allocations.`);
        continue;
      }

      const active = await FinalJob.findOne({
        shop_id: job.shop_id,
        $or: orClauses,
        job_status: { $ne: 'completed' }
      }).lean();
      if (!active) { selected = cand; break; }
    }
    if (!selected) {
      console.warn(`[JobPoller] All compatible printers busy for job ${job.job_number} in shop ${job.shop_id}.`);
      continue;
    }
    const finalSource = selected.useAgentValues ? selected.agentDetected : selected.manualOverride;
    const assignedName = finalSource?.name || selected.agentDetected?.name || 'Unknown Printer';

    const upsertData = {
      job_number: job.job_number,
      customer: job.customer,
      shop: job.shop,
      shop_id: job.shop_id,
      document_urls: job.document_urls,
      print_options: job.print_options,
      total_amount: job.total_amount,
      payment_status: job.payment_status,
      job_status: 'pending', // lifecycle state before printing
      printer_status: 'alloted',
      collection_pin: job.collection_pin,
      queued_at: job.queued_at,
      processing_started_at: job.processing_started_at,
      printing_started_at: job.printing_started_at,
      completed_at: job.completed_at,
      printer_assigned_at: new Date(),
      assigned_printer: assignedName,
      printerid: selected.printerid,
      printer_config: finalSource,
      agent_id: job.agent_id,
      status: job.status,
      files_processed: job.files_processed,
      pages_printed: job.pages_printed,
      current_file: job.current_file,
      printed_by: assignedName,
      processing_time_seconds: job.processing_started_at && job.completed_at ? Math.round((job.completed_at - job.processing_started_at) / 1000) : undefined,
      queue_confirmed: true,
      manualTriggered: false,
      autoPrintMode: !!shop.autoPrintMode,
      createdAt: job.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Atomically claim the Job document so concurrent pollers won't double-assign
    const claimedJob = await Job.findOneAndUpdate(
      { _id: job._id, printer_status: 'pending' },
      { $set: { printer_status: 'alloted', job_status: 'pending', assigned_printer: assignedName, printer_assigned_at: new Date() } },
      { new: true }
    );
    if (!claimedJob) {
      console.log(`[JobPoller] Job ${job.job_number} was already claimed by another process; skipping.`);
      continue;
    }

    // Upsert to finaljobs keyed by job_number
    const res = await FinalJob.updateOne(
      { job_number: job.job_number },
      { $set: upsertData },
      { upsert: true }
    );
    console.log(`[JOB-ALLOC] ShopId: ${job.shop_id}, Job: ${job.job_number}, Printer: ${assignedName}, Mode: ${!!shop.autoPrintMode ? 'Auto' : 'Manual'}`);
  }

  // Reconcile: any printers stuck in pending_off but with no active jobs → set to off
  try {
  const shops = await NewShop.find({ 'printers.manualStatus': 'pending_off' });
    for (const shop of shops) {
      let changed = false;
      for (const p of (shop.printers || [])) {
        if (p.manualStatus !== 'pending_off') continue;
        const pid = p.printerid || p.printerId;
        const pname = p.agentDetected?.name;
        const active = await FinalJob.findOne({
          shop_id: shop.shop_id || shop.shopId,
          $or: [
            { printerid: pid },
            { assigned_printer: pid },
            ...(pname ? [{ assigned_printer: pname }] : [])
          ],
          job_status: { $ne: 'completed' }
        }).lean();
        if (!active) {
          p.manualStatus = 'off';
          changed = true;
        }
      }
      if (changed) await shop.save();
    }
  } catch (e) {
    console.error('[JobPoller] Reconcile pending_off failed:', e.message);
  }
}

setInterval(pollJobsAndAssignPrinters, 15000);
module.exports = pollJobsAndAssignPrinters;
