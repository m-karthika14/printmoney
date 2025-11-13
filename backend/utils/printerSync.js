const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

// Loose model for the agent "printers" collection
const AgentPrinter = mongoose.model('AgentPrinter', new mongoose.Schema({}, { strict: false }), 'printers');

let isSyncRunning = false;
// Set to true to remove printers from NewShop.printers when agent no longer reports them.
// WARNING: This will delete printer entries (including manualOverride). Use with caution.
const REMOVE_MISSING_PRINTERS = true;

function normalizeStatus(status) {
  if (!status) return 'offline';
  const s = String(status).toLowerCase();
  if (s === 'ready' || s === 'online') return 'online';
  if (s === 'busy') return 'online'; // treat busy as online for presence
  return 'offline';
}

function normalizeType(cap) {
  // Agent-reported capabilities may come in various shapes and value types.
  // For agent-detected values we only allow two final values: 'Color' or 'B/W'.
  if (!cap) return 'B/W';

  const read = (k) => {
    const v = cap[k];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'y' || s === 'on';
    }
    return undefined;
  };

  // Try several common candidate keys
  const color = read('color') ?? read('colorSupported') ?? read('colorSupport') ?? read('isColor');
  const bw = read('bw') ?? read('grayscale') ?? read('bwSupported') ?? read('blackAndWhite');

  // If agent explicitly reports color true and not bw, return Color.
  if (color && !bw) return 'Color';
  // If agent explicitly reports bw true and not color, return B/W.
  if (bw && !color) return 'B/W';
  // Default: if color truthy treat as Color, else B/W
  if (color) return 'Color';
  return 'B/W';
}

function toStringArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === 'string') return [val];
  return [];
}

function extractPaperSizes(ap) {
  // Support multiple possible shapes from agent
  const candidates = [
    ap?.paper_sizes,
    ap?.paperSizes,
    ap?.papersupported,
    ap?.paperssupported,
    ap?.capabilities?.paper_sizes,
    ap?.capabilities?.paperSizes,
  ];
  const merged = candidates.flatMap(toStringArray);
  // unique, preserve order
  const seen = new Set();
  const out = [];
  for (const s of merged) {
    const v = String(s).trim();
    if (!v) continue;
    if (!seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}

/**
 * Synchronize agent-detected printers into newshops.printers
 * - If shopIdFilter provided, sync only that shop; else sync all
 * - Returns summary per shop and totals
 */
let getIOSafe = null;
try { getIOSafe = require('../socket').getIO; } catch {}

async function syncPrinters(shopIdFilter) {
  const summary = { totals: { inserted: 0, updated: 0, skipped: 0 }, perShop: [] };

  const agentDocs = shopIdFilter
    ? await AgentPrinter.find({ shop_id: shopIdFilter })
    : await AgentPrinter.find();

  console.log(`[PRINTER-SYNC] Start run; docs=${agentDocs.length}${shopIdFilter ? ` filter shopId=${shopIdFilter}` : ''}`);

  for (const agentDoc of agentDocs) {
    const shopId = agentDoc.shop_id;
    if (!shopId) {
      console.warn('[PRINTER-SYNC] agentDoc missing shop_id, skipping:', agentDoc._id);
      summary.totals.skipped++;
      continue;
    }

  const shop = await NewShop.findOne({ shop_id: shopId });
    if (!shop) {
      console.warn(`[PRINTER-SYNC] No shop for shopId=${shopId}`);
      summary.totals.skipped++;
      continue;
    }

  const existingMap = new Map((shop.printers || []).map(p => [(p.printerid || p.printerId), p]));
    let inserted = 0, updated = 0, skipped = 0;

    const list = Array.isArray(agentDoc.printers) ? agentDoc.printers : [];
    // Track which printer ids we saw from the agent this run
    const agentSeenIds = new Set();
    for (const ap of list) {
      const pid = (ap.printer_id || '').trim();
      if (!pid) {
        console.warn(`[PRINTER-SYNC] Skipping printer with missing id in agentDoc ${agentDoc._id}`);
        skipped++;
        continue;
      }
      agentSeenIds.add(pid);

      const incoming = {
        printerid: pid,
        status: normalizeStatus(ap.status || 'offline'),
        port: ap.port || null,
        lastUpdate: ap.last_update ? new Date(ap.last_update) : (ap.updated_at ? new Date(ap.updated_at) : new Date()),
        agentDetected: {
          name: ap.name || '',
          status: ap.status || '',
          capabilities: [
            {
              type: normalizeType(ap.capabilities),
              duplex: !!ap.capabilities?.duplex,
              paperSizes: extractPaperSizes(ap)
            }
          ]
        }
      };

      let existing = existingMap.get(pid);
      if (existing) {
        // migrate legacy field name if needed
        if (!existing.printerid) {
          existing.printerid = pid;
          try { delete existing.printerId; } catch (e) {}
        }
        existing.agentDetected = incoming.agentDetected;
        existing.status = incoming.status;
        existing.port = incoming.port;
        existing.lastUpdate = incoming.lastUpdate;
        updated++;
      } else {
        // Try to migrate a legacy entry without printerid but same name
        const legacyByName = (shop.printers || []).find(p => !p.printerid && !p.printerId && (p.agentDetected?.name || '').trim() === (incoming.agentDetected.name || '').trim());
        if (legacyByName) {
          legacyByName.printerid = pid;
          legacyByName.agentDetected = incoming.agentDetected;
          legacyByName.status = incoming.status;
          legacyByName.port = incoming.port;
          legacyByName.lastUpdate = incoming.lastUpdate;
          updated++;
        } else {
          shop.printers.push({
            printerid: incoming.printerid,
            status: incoming.status,
            port: incoming.port,
            lastUpdate: incoming.lastUpdate,
            agentDetected: incoming.agentDetected,
            manualOverride: {},
            useAgentValues: true
          });
          inserted++;
        }
      }
    }

    if (REMOVE_MISSING_PRINTERS) {
      // Remove printers not reported by the agent this run
      shop.printers = (shop.printers || []).filter(p => {
        const key = p.printerid || p.printerId;
        if (!key) return false; // drop legacy entries without identifiable id
        return agentSeenIds.has(key);
      });
    } else {
      // Mark missing printers as offline (conservative)
      for (const p of (shop.printers || [])) {
        const key = p.printerid || p.printerId;
        if (!key) continue;
        if (!agentSeenIds.has(key)) {
          p.status = 'offline';
          if (!p.agentDetected) p.agentDetected = {};
          p.agentDetected.status = 'offline';
        }
      }
      // Ensure uniqueness by printerid (keep last occurrence)
      const unique = new Map();
      for (const p of shop.printers) {
        const key = p.printerid || p.printerId || undefined;
        if (!key) {
          continue;
        }
        unique.set(key, p);
      }
      shop.printers = Array.from(unique.values());
    }

    await shop.save();
    // Emit printers:update so subscribed clients refresh immediately (fallback: polling remains)
    try {
      if (getIOSafe && shop && shop.shop_id) {
        getIOSafe().to(`shop:${shop.shop_id}`).emit('printers:update');
      }
    } catch (e) {
      // ignore socket errors
    }
    console.log(`[PRINTER-SYNC] shop ${shop.shop_id} — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`);
  summary.perShop.push({ shopId: shop.shop_id, inserted, updated, skipped });
    summary.totals.inserted += inserted;
    summary.totals.updated += updated;
    summary.totals.skipped += skipped;
  }

  console.log('[PRINTER-SYNC] Completed sync run');
  return summary;
}

async function scheduledSync(shopIdFilter) {
  if (isSyncRunning) return null;
  isSyncRunning = true;
  try {
    return await syncPrinters(shopIdFilter);
  } catch (err) {
    console.error('[PRINTER-SYNC] Error:', err);
    return null;
  } finally {
    isSyncRunning = false;
  }
}

// Presence watchdog: mark printers offline when heartbeats are stale
// This version updates only the changed printer elements using arrayFilters when possible
// and emits a payload with the changed printers so frontends can refresh incrementally.
async function presenceWatchdog({ staleAfterMs = 60 * 1000 } = {}) {
  try {
    const now = Date.now();
    const shops = await NewShop.find({}, { shop_id: 1, printers: 1 }).lean();
    for (const shop of shops) {
      if (!shop || !Array.isArray(shop.printers) || !shop.shop_id) continue;
      const changedCandidates = [];
      for (const p of shop.printers) {
        try {
          const last = p && p.lastUpdate ? new Date(p.lastUpdate) : null;
          const lastMs = last && !isNaN(last.getTime()) ? last.getTime() : 0;
          const shouldBeOnline = (now - lastMs) <= staleAfterMs;
          const desiredStatus = shouldBeOnline ? 'online' : 'offline';
          const currentStatus = (p.status || 'offline');
          if (currentStatus !== desiredStatus) {
            changedCandidates.push({ printerid: p.printerid || null, printerId: p.printerId || null, desiredStatus, previousStatus: currentStatus });
          }
        } catch (e) {
          // swallow per-printer parse errors and continue
        }
      }

      if (!changedCandidates.length) continue;

      const results = [];
      // Try to update each changed printer using atomic arrayFilters where possible.
      for (const ch of changedCandidates) {
        let updated = false;
        // Prefer matching on canonical `printerid` when available
        try {
          if (ch.printerid) {
            const setOps = { ['printers.$[p].status']: ch.desiredStatus, ['printers.$[p].agentDetected.status']: ch.desiredStatus };
            const res = await NewShop.updateOne(
              { shop_id: shop.shop_id },
              { $set: setOps },
              { arrayFilters: [{ 'p.printerid': ch.printerid }] }
            ).catch(() => null);
            if (res && (res.modifiedCount > 0 || res.nModified > 0 || res.ok)) {
              // Note: some mongoose/mongodb versions return different fields; treat ok as non-fatal.
              updated = true;
            }
          }
        } catch (e) {
          // fall through to next attempt
        }

        // If not updated, try matching legacy `printerId` field
        if (!updated && ch.printerId) {
          try {
            const setOps = { ['printers.$[p].status']: ch.desiredStatus, ['printers.$[p].agentDetected.status']: ch.desiredStatus };
            const res2 = await NewShop.updateOne(
              { shop_id: shop.shop_id },
              { $set: setOps },
              { arrayFilters: [{ 'p.printerId': ch.printerId }] }
            ).catch(() => null);
            if (res2 && (res2.modifiedCount > 0 || res2.nModified > 0 || res2.ok)) updated = true;
          } catch (e) {}
        }

        // Fallback: if atomic updates didn't apply (maybe unexpected shape), rewrite the document safely
        if (!updated) {
          try {
            const shopDoc = await NewShop.findOne({ shop_id: shop.shop_id });
            if (shopDoc && Array.isArray(shopDoc.printers)) {
              let localChanged = false;
              shopDoc.printers = shopDoc.printers.map(pp => {
                const key = pp.printerid || pp.printerId || null;
                if (key && (key === ch.printerid || key === ch.printerId)) {
                  if ((pp.status || 'offline') !== ch.desiredStatus) {
                    pp.status = ch.desiredStatus;
                    localChanged = true;
                  }
                  try {
                    if (!pp.agentDetected) pp.agentDetected = {};
                    if ((pp.agentDetected.status || 'offline') !== ch.desiredStatus) {
                      pp.agentDetected.status = ch.desiredStatus;
                      localChanged = true;
                    }
                  } catch (e) {}
                }
                return pp;
              });
              if (localChanged) {
                await shopDoc.save();
                updated = true;
              }
            }
          } catch (e) {
            // ignore fallback errors for this printer
          }
        }

        results.push({ printer: ch.printerid || ch.printerId || null, desiredStatus: ch.desiredStatus, updated });
      }

      // Diagnostic log: print exact changed printers for debugging
      try {
        console.log(`[PRESENCE-WATCHDOG] shop ${shop.shop_id} changed:`, JSON.stringify(results, null, 2));
      } catch (e) {
        // ignore logging errors
      }
      // Emit changed printers payload for clients to act upon
      try {
        if (getIOSafe) {
          try { getIOSafe().to(`shop:${shop.shop_id}`).emit('printers:update', { changed: results }); } catch (e) {}
        }
      } catch (e) {}

      console.log(`[PRESENCE-WATCHDOG] shop ${shop.shop_id} — updated ${results.filter(r => r.updated).length}/${results.length} printers`);
    }
  } catch (err) {
    console.error('[PRESENCE-WATCHDOG] Error scanning shops:', err && err.message ? err.message : err);
  }
}

module.exports = { syncPrinters, scheduledSync, presenceWatchdog };
