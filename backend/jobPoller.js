const Job = require('./models/Job');
const FinalJob = require('./models/FinalJob');
const NewShop = require('./models/NewShop');

function jobRequiresColor(printOptions) {
  const pt = (printOptions?.printType || '').toString().toLowerCase();
  return pt === 'color' || pt === 'colour';
}

function jobPrintTypeToken(printOptions) {
  const pt = (printOptions?.printType || '').toString().toLowerCase();
  if (pt === 'mixed' || pt === 'mixedcolor' || pt === 'color+bw' || pt === 'color_bw') return 'mixed';
  if (pt === 'color' || pt === 'colour') return 'color';
  return 'bw';
}

function jobDuplexToken(printOptions) {
  const dp = (printOptions?.duplex || '').toString().toLowerCase();
  if (dp === 'double' || dp === 'duplex') return 'double';
  if (dp === 'single' || dp === 'single-side' || dp === 'single_side') return 'single';
  return 'any';
}

// Returns { ok: boolean, reason?: string }
function matchesPrinterWithReason(job, printer) {
  if (!printer) return { ok: false, reason: 'printer object missing' };
  if (printer.status !== 'online') return { ok: false, reason: `offline (status=${printer.status})` };
  if (printer.manualStatus === 'off') return { ok: false, reason: 'manually turned off' };
  if (printer.manualStatus === 'pending_off') return { ok: false, reason: 'pending_off (shopkeeper requested off)' };

  // Use merged/finalized config: manual override per-field should win, agent values used otherwise
  const merged = getFinalPrinterConfig(printer);
  if (!merged || !Array.isArray(merged.capabilities) || merged.capabilities.length === 0) return { ok: false, reason: 'no capabilities available' };

  const requiredSize = job.print_options?.paperSize;

  // Capabilities may contain multiple entries; accept if any capability satisfies requirements
  const capsArray = Array.isArray(merged.capabilities) ? merged.capabilities : [];
  for (const caps of capsArray) {
    if (!caps) continue;
    // Treat color-capable printers as able to print both color and B/W jobs
    const capType = String(caps.type || '').toLowerCase();
    const jobToken = jobPrintTypeToken(job.print_options || {});

    // Type check
    let typeOk = false;
    if (jobToken === 'mixed') {
      typeOk = /color\W*bw|bw\W*color|color\s*\+\s*bw|b\/w/i.test(String(caps.type || ''));
    } else if (jobToken === 'color') {
      typeOk = capType.includes('color');
    } else {
      // bw job -> any printer acceptable
      typeOk = true;
    }
    if (!typeOk) continue;

    // Duplex check
    const duplexToken = jobDuplexToken(job.print_options || {});
    const duplexOk = duplexToken === 'double' ? !!caps.duplex : true;
    if (!duplexOk) continue;

    // Paper size check (exact match but case-insensitive, trimmed)
    if (requiredSize) {
      if (!Array.isArray(caps.paperSizes) || caps.paperSizes.length === 0) continue;
      const need = String(requiredSize).trim().toLowerCase();
      const normalized = caps.paperSizes.map(s => String(s).trim().toLowerCase());
      if (!normalized.includes(need)) continue;
    }

    // All checks passed for this capability
    return { ok: true };
  }
  return { ok: false, reason: 'no capability matched (type/duplex/paperSize mismatch)' };
}

function matchesPrinter(job, printer) {
  return matchesPrinterWithReason(job, printer).ok;
}

function printerHasColorCapability(printer) {
  const merged = getFinalPrinterConfig(printer);
  if (!merged || !Array.isArray(merged.capabilities)) return false;
  for (const caps of merged.capabilities) {
    if (!caps) continue;
    try {
      if (String(caps.type).toLowerCase().includes('color')) return true;
    } catch (e) {}
  }
  return false;
}

// Compute finalized printer configuration used for allocation
function getFinalPrinterConfig(printer) {
  if (!printer) return null;
  const agentCap = (printer.agentDetected && Array.isArray(printer.agentDetected.capabilities) ? printer.agentDetected.capabilities[0] : (printer.agentDetected && printer.agentDetected.capabilities)) || {};
  const manualCap = (printer.manualOverride && Array.isArray(printer.manualOverride.capabilities) ? printer.manualOverride.capabilities[0] : (printer.manualOverride && printer.manualOverride.capabilities)) || {};

  // For each field prefer manual override when present, else agent
  const type = (typeof manualCap.type !== 'undefined' && manualCap.type !== null && String(manualCap.type).trim() !== '') ? manualCap.type : agentCap.type;
  const duplex = (typeof manualCap.duplex !== 'undefined' && manualCap.duplex !== null) ? !!manualCap.duplex : !!agentCap.duplex;
  const paperSizes = (Array.isArray(manualCap.paperSizes) && manualCap.paperSizes.length) ? manualCap.paperSizes : (Array.isArray(agentCap.paperSizes) ? agentCap.paperSizes : []);

  const name = (printer.manualOverride && printer.manualOverride.name) || (printer.agentDetected && printer.agentDetected.name) || printer.printerid || '';

  return {
    name,
    type,
    duplex,
    paperSizes,
    // keep original shapes for compatibility
    capabilities: [{ type, duplex, paperSizes }]
  };
}

async function pollJobsAndAssignPrinters(shopIdFilter) {
  console.info('[JobPoller] Polling jobs collection for pending jobs...');
  const query = { printer_status: 'pending' };
  if (shopIdFilter) query.shop_id = shopIdFilter;
  const pendingJobs = await Job.find(query);
  console.info(`[JobPoller] Found ${pendingJobs.length} pending jobs.`);
  for (const job of pendingJobs) {
    // Idempotency: if already in finaljobs, skip (by job_number)
    const exists = await FinalJob.findOne({ job_number: job.job_number });
    if (exists) {
      console.info(`[JobPoller] Job ${job.job_number} already present in finaljobs, marking alloted and skipping.`);
      await Job.updateOne({ _id: job._id }, { $set: { printer_status: 'alloted' } });
      continue;
    }

      const shop = await NewShop.findOne({ shop_id: job.shop_id });
    if (!shop || !Array.isArray(shop.printers) || shop.printers.length === 0) {
      console.info(`[JobPoller] No printers for shop ${job.shop_id} — skip job ${job.job_number}.`);
      continue;
    }

    // Evaluate each printer and collect candidates; log reasons for rejections to aid debugging
    const candidateList = [];
    for (const p of (shop.printers || [])) {
      const res = matchesPrinterWithReason(job, p);
      if (res.ok) candidateList.push(p);
      else {
        const pid = p.printerid || p.printerId || (p.agentDetected && p.agentDetected.name) || JSON.stringify(p?.manualOverride?.name || p?.agentDetected?.name || 'unknown');
        console.debug(`[JobPoller] Printer skipped for job ${job.job_number} (shop ${job.shop_id}) -> printer=${pid}, reason=${res.reason}`);
      }
    }
    let candidates = candidateList;
    // If the job requires color, prefer printers that advertise color capability.
    const jobToken = jobPrintTypeToken(job.print_options || {});
    if (candidates.length > 1) {
      if (jobToken === 'bw') {
        // prefer pure B/W printers first
        const bwPref = [];
        const rest = [];
        for (const p of candidates) {
          const t = getFinalPrinterConfig(p)?.capabilities?.[0]?.type || '';
          const token = String(t || '').toLowerCase().includes('color') ? ( /color\W*bw|bw\W*color|color\s*\+\s*bw|b\/w/i.test(String(t || '')) ? 'color+bw' : 'color') : 'bw';
          if (token === 'bw') bwPref.push(p); else rest.push(p);
        }
        candidates = bwPref.concat(rest);
      } else if (jobToken === 'color') {
        // prefer pure color printers, then color+bw, then others
        const colorPref = [], colorBw = [], others = [];
        for (const p of candidates) {
          const t = getFinalPrinterConfig(p)?.capabilities?.[0]?.type || '';
          const tok = String(t || '').toLowerCase().includes('color') ? ( /color\W*bw|bw\W*color|color\s*\+\s*bw|b\/w/i.test(String(t || '')) ? 'color+bw' : 'color') : 'bw';
          if (tok === 'color') colorPref.push(p);
          else if (tok === 'color+bw') colorBw.push(p);
          else others.push(p);
        }
        candidates = colorPref.concat(colorBw).concat(others);
      } else if (jobToken === 'mixed') {
        // For mixed jobs, if the shop has separate color & bw printers, try to split between them.
        try {
          const printers = shop.printers || [];
          // Candidates for color and bw halves
          const colorCandidates = printers.filter(p => matchesPrinterWithReason(Object.assign({}, job, { print_options: Object.assign({}, job.print_options || {}, { printType: 'color' }) }), p).ok);
          const bwCandidates = printers.filter(p => matchesPrinterWithReason(Object.assign({}, job, { print_options: Object.assign({}, job.print_options || {}, { printType: 'bw' }) }), p).ok);
          let splitPair = null;
          // Try to find two distinct printers (color and bw)
          for (const c of colorCandidates) {
            for (const b of bwCandidates) {
              const cid = c.printerid || c.printerId || c.agentDetected?.name;
              const bid = b.printerid || b.printerId || b.agentDetected?.name;
              if (!cid || !bid) continue;
              if (cid === bid) continue; // same physical printer - skip
              // Ensure both printers are not active (no active FinalJob)
              const colorBusy = await FinalJob.findOne({ shop_id: job.shop_id, $or: [{ printerid: cid }, { assigned_printer: cid }], job_status: { $ne: 'completed' } }).lean();
              const bwBusy = await FinalJob.findOne({ shop_id: job.shop_id, $or: [{ printerid: bid }, { assigned_printer: bid }], job_status: { $ne: 'completed' } }).lean();
              if (colorBusy || bwBusy) continue;
              splitPair = { color: c, bw: b };
              break;
            }
            if (splitPair) break;
          }
          if (splitPair) {
            // Mark special candidates marker to be handled as split allocation later
            candidates = [ { __split: true, color: splitPair.color, bw: splitPair.bw } ];
          } else {
            // fallback: filter only color+bw capable printers (single-printer handling)
            const mixedOnly = candidates.filter(p => {
              const t = getFinalPrinterConfig(p)?.capabilities?.[0]?.type || '';
              return /color\W*bw|bw\W*color|color\s*\+\s*bw|b\/w/i.test(String(t || ''));
            });
            candidates = mixedOnly;
          }
        } catch (e) {
          console.debug('[JobPoller] Mixed-split allocation attempt failed, falling back to single-printer handling:', e && e.message ? e.message : e);
          const mixedOnly = candidates.filter(p => {
            const t = getFinalPrinterConfig(p)?.capabilities?.[0]?.type || '';
            return /color\W*bw|bw\W*color|color\s*\+\s*bw|b\/w/i.test(String(t || ''));
          });
          candidates = mixedOnly;
        }
      }
    }
    if (candidates.length === 0) {
      console.warn(`[JobPoller] No compatible printer for job ${job.job_number} in shop ${job.shop_id}.`);
      continue;
    }

    // One-active-job-per-printer: filter out printers with active finaljobs
    let selected = null;
    // If we created a split-pair marker for mixed allocation, accept it directly (we already checked busy earlier)
    if (candidates.length === 1 && candidates[0] && candidates[0].__split) {
      selected = candidates[0];
    } else {
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
    }
    if (!selected) {
      console.warn(`[JobPoller] All compatible printers busy for job ${job.job_number} in shop ${job.shop_id}.`);
      continue;
    }
  // Use finalized config for allocation (merged manual+agent per-field)
  let finalSource = null;
  let assignedName = 'Unknown Printer';

  if (selected && selected.__split) {
    // split allocation between two printers
    const colorPrinter = selected.color;
    const bwPrinter = selected.bw;
    const colorCfg = getFinalPrinterConfig(colorPrinter);
    const bwCfg = getFinalPrinterConfig(bwPrinter);
    finalSource = { color: colorCfg, bw: bwCfg };
    assignedName = `${colorCfg?.name || colorPrinter.agentDetected?.name || 'Color'} + ${bwCfg?.name || bwPrinter.agentDetected?.name || 'B/W'}`;
  } else {
    finalSource = getFinalPrinterConfig(selected);
    assignedName = finalSource?.name || selected.agentDetected?.name || 'Unknown Printer';
  }

    const upsertData = {
      job_number: job.job_number,
      customer: job.customer,
      shop: job.shop,
      shop_id: job.shop_id,
      document_urls: job.document_urls,
      print_options: job.print_options,
      total_amount: job.total_amount,
      // propagate page counts from Job into FinalJob (support both snake_case and legacy camelCase)
      total_pages: (typeof job.total_pages !== 'undefined') ? job.total_pages : (typeof job.totalpages !== 'undefined' ? job.totalpages : undefined),
      total_printed_pages: (typeof job.total_printed_pages !== 'undefined') ? job.total_printed_pages : (typeof job.totalpagesprinted !== 'undefined' ? job.totalpagesprinted : undefined),
  payment_status: job.payment_status,
  // Copy watermark information from Job into FinalJob (Job.watermark may contain global + perDocument)
  watermark: (typeof job.watermark !== 'undefined') ? job.watermark : undefined,
  perDocumentWatermarks: (job.watermark && typeof job.watermark.perDocument !== 'undefined') ? job.watermark.perDocument : (typeof job.perDocumentWatermarks !== 'undefined' ? job.perDocumentWatermarks : (typeof job.perDocument !== 'undefined' ? job.perDocument : undefined)),
  // Also populate the legacy/alternate field name used elsewhere in the codebase
  perDocOptions: (job.watermark && typeof job.watermark.perDocument !== 'undefined') ? job.watermark.perDocument : (typeof job.perDocOptions !== 'undefined' ? job.perDocOptions : (typeof job.perDocument !== 'undefined' ? job.perDocument : undefined)),
      job_status: 'pending', // lifecycle state before printing
      printer_status: 'alloted',
      collection_pin: job.collection_pin,
      queued_at: job.queued_at,
      processing_started_at: job.processing_started_at,
      printing_started_at: job.printing_started_at,
      completed_at: job.completed_at,
      printer_assigned_at: new Date(),
      assigned_printer: selected && selected.__split ? null : assignedName,
      printerid: selected && selected.__split ? null : selected.printerid,
      printer_config: finalSource,
  // (Legacy camelCase fields removed: FinalJob will store only total_pages and total_printed_pages)
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

  // If this is a split allocation, attach subJobs and isMixed
  if (selected && selected.__split) {
    const colorPrinter = selected.color;
    const bwPrinter = selected.bw;
    upsertData.isMixed = true;
    upsertData.subJobs = {
      color: {
        printerid: colorPrinter.printerid || colorPrinter.printerId || null,
        assigned_printer: (getFinalPrinterConfig(colorPrinter)?.name) || (colorPrinter.agentDetected && colorPrinter.agentDetected.name) || null,
        status: 'pending',
        retryCount: 0
      },
      bw: {
        printerid: bwPrinter.printerid || bwPrinter.printerId || null,
        assigned_printer: (getFinalPrinterConfig(bwPrinter)?.name) || (bwPrinter.agentDetected && bwPrinter.agentDetected.name) || null,
        status: 'pending',
        retryCount: 0
      }
    };
  }

    // Atomically claim the Job document so concurrent pollers won't double-assign
    const claimedJob = await Job.findOneAndUpdate(
      { _id: job._id, printer_status: 'pending' },
      { $set: { printer_status: 'alloted', job_status: 'pending', assigned_printer: assignedName, printer_assigned_at: new Date() } },
      { new: true }
    );
    if (!claimedJob) {
      console.info(`[JobPoller] Job ${job.job_number} was already claimed by another process; skipping.`);
      continue;
    }

    // Upsert to finaljobs keyed by job_number
    const res = await FinalJob.updateOne(
      { job_number: job.job_number },
      { $set: upsertData },
      { upsert: true }
    );
  console.info(`[JOB-ALLOC] ShopId: ${job.shop_id}, Job: ${job.job_number}, Printer: ${assignedName}, Mode: ${!!shop.autoPrintMode ? 'Auto' : 'Manual'}`);
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
              shop_id: shop.shop_id,
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
// Watchdog: periodically scan FinalJobs that appear stuck and either auto-retry or auto-fail
async function watchdogCheck() {
  try {
    console.info('[JobPoller:Watchdog] Scanning for stuck FinalJobs...');
    const THIRTY_MIN = 30 * 60 * 1000;
    const now = Date.now();
    // Consider jobs that are not completed and that have been assigned to a printer some time ago
    const candidates = await FinalJob.find({
      job_status: { $in: ['pending', 'printing'] },
      $or: [ { printer_assigned_at: { $exists: true } }, { printing_started_at: { $exists: true } } ]
    }).lean();
    for (const doc of candidates) {
      try {
        const lastAssigned = doc.printer_assigned_at ? new Date(doc.printer_assigned_at).getTime() : (doc.printing_started_at ? new Date(doc.printing_started_at).getTime() : 0);
        if (!lastAssigned) continue;
        if ((now - lastAssigned) <= THIRTY_MIN) {
          // Not yet aged long enough
          continue;
        }

            // If this is a mixed job with subJobs, handle per-subjob retry logic
            if (doc.isMixed && doc.subJobs && typeof doc.subJobs === 'object') {
              const updates = {};
              let madeChange = false;
              const maxRetries = (typeof doc.maxRetries === 'number' && !Number.isNaN(doc.maxRetries)) ? doc.maxRetries : 2;
              for (const side of Object.keys(doc.subJobs)) {
                try {
                  const s = doc.subJobs[side] || {};
                  const sStatus = String(s.status || '').toLowerCase();
                  // consider pending/printing as candidates for retry
                  if (sStatus === 'pending' || sStatus === 'printing') {
                    const sRetry = typeof s.retryCount === 'number' ? s.retryCount : 0;
                    if (sRetry < maxRetries) {
                      // Auto-retry this subjob
                      console.info(`[JobPoller:Watchdog] Auto-retry subjob ${side} (#${sRetry + 1}) for job ${doc.job_number}`);
                      updates[`subJobs.${side}.retryCount`] = sRetry + 1;
                      updates[`subJobs.${side}.status`] = 'pending';
                      updates.stuckSince = new Date();
                      updates.updatedAt = new Date();
                      madeChange = true;
                    } else {
                      // Exceeded retries -> mark subjob failed
                      console.info(`[JobPoller:Watchdog] Auto-failing subjob ${side} for job ${doc.job_number} after ${sRetry} retries`);
                      updates[`subJobs.${side}.status`] = 'failed';
                      updates.stuckSince = new Date();
                      updates.updatedAt = new Date();
                      madeChange = true;
                    }
                  }
                } catch (e) {
                  console.debug('[JobPoller:Watchdog] subjob handling error', e && e.message ? e.message : e);
                }
              }
              if (madeChange) {
                await FinalJob.updateOne({ _id: doc._id }, { $set: updates });
              }
              // Recompute overall job status after potential subjob changes
              const refreshed = await FinalJob.findById(doc._id).lean();
              if (refreshed) {
                const subs = refreshed.subJobs || {};
                const sides = Object.keys(subs);
                let completedCount = 0, failedCount = 0;
                for (const side of sides) {
                  const s = subs[side] || {};
                  const st = String(s.status || '').toLowerCase();
                  if (st === 'completed') completedCount++;
                  if (st === 'failed') failedCount++;
                }
                let newJobStatus = refreshed.job_status;
                if (completedCount === sides.length) newJobStatus = 'completed';
                else if (failedCount === sides.length) newJobStatus = 'failed';
                else if (failedCount > 0 && completedCount > 0) newJobStatus = 'partially_failed';
                else newJobStatus = 'printing';
                if (newJobStatus !== refreshed.job_status) {
                  await FinalJob.updateOne({ _id: doc._id }, { $set: { job_status: newJobStatus, updatedAt: new Date() } });
                  try {
                    await Job.findOneAndUpdate({ job_number: doc.job_number }, { $set: { job_status: newJobStatus } });
                  } catch (e) {
                    console.debug('[JobPoller:Watchdog] Failed to update Job record after subjob status change:', e && e.message ? e.message : e);
                  }
                }
              }
              continue;
            }

            // Non-mixed jobs: use global retryCount and maxRetries
            const retryCount = typeof doc.retryCount === 'number' ? doc.retryCount : 0;
            const maxRetriesGlobal = (typeof doc.maxRetries === 'number' && !Number.isNaN(doc.maxRetries)) ? doc.maxRetries : 2;
            // If retryCount < maxRetries -> auto-retry: set job/printer back to pending so poller can reassign
            if (retryCount < maxRetriesGlobal) {
              console.info(`[JobPoller:Watchdog] Auto-retry #${retryCount + 1} for job ${doc.job_number} (shop ${doc.shop_id})`);
              await FinalJob.updateOne({ _id: doc._id }, {
                $inc: { retryCount: 1 },
                $set: {
                  job_status: 'pending',
                  printer_status: 'pending',
                  assigned_printer: null,
                  printerid: null,
                  printer_assigned_at: null,
                  stuckSince: new Date(),
                  updatedAt: new Date()
                }
              });
              // Also reset Job record so the poller will see it again
              try {
                await Job.findOneAndUpdate({ job_number: doc.job_number }, { $set: { printer_status: 'pending', job_status: 'pending' } });
              } catch (e) {
                console.debug('[JobPoller:Watchdog] Failed to update Job record for retry:', e && e.message ? e.message : e);
              }
              continue;
            }

            // retryCount >= maxRetries -> mark as failed permanently
            console.info(`[JobPoller:Watchdog] Auto-failing job ${doc.job_number} after ${retryCount} retries (shop ${doc.shop_id})`);
            await FinalJob.updateOne({ _id: doc._id }, { $set: { job_status: 'failed', printer_status: 'failed', failed_at: new Date(), updatedAt: new Date() } });
            try {
              await Job.findOneAndUpdate({ job_number: doc.job_number }, { $set: { job_status: 'failed', printer_status: 'failed' } });
            } catch (e) {
              console.debug('[JobPoller:Watchdog] Failed to update Job record for fail:', e && e.message ? e.message : e);
            }
      } catch (e) {
        console.error('[JobPoller:Watchdog] Error handling candidate', doc && doc.job_number, e && e.message ? e.message : e);
      }
    }
  } catch (e) {
    console.error('[JobPoller:Watchdog] scan failed:', e && e.message ? e.message : e);
  }
}

// Run watchdog every 3 minutes
setInterval(watchdogCheck, 3 * 60 * 1000);
module.exports = pollJobsAndAssignPrinters;
