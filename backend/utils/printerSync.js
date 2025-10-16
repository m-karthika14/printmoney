const mongoose = require('mongoose');
const NewShop = require('../models/NewShop');

// Loose model for the agent "printers" collection
const AgentPrinter = mongoose.model('AgentPrinter', new mongoose.Schema({}, { strict: false }), 'printers');

let isSyncRunning = false;

function normalizeStatus(status) {
  if (!status) return 'offline';
  const s = String(status).toLowerCase();
  if (s === 'ready' || s === 'online') return 'online';
  if (s === 'busy') return 'online'; // treat busy as online for presence
  return 'offline';
}

function normalizeType(cap) {
  if (!cap) return 'B/W';
  if (cap.color === true) return 'Color';
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

  const shop = await NewShop.findOne({ $or: [{ shop_id: shopId }, { shopId }] });
    if (!shop) {
      console.warn(`[PRINTER-SYNC] No shop for shopId=${shopId}`);
      summary.totals.skipped++;
      continue;
    }

  const existingMap = new Map((shop.printers || []).map(p => [(p.printerid || p.printerId), p]));
    let inserted = 0, updated = 0, skipped = 0;

    const list = Array.isArray(agentDoc.printers) ? agentDoc.printers : [];
    for (const ap of list) {
      const pid = (ap.printer_id || '').trim();
      if (!pid) {
        console.warn(`[PRINTER-SYNC] Skipping printer with missing id in agentDoc ${agentDoc._id}`);
        skipped++;
        continue;
      }

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

    // Ensure uniqueness by printerid (keep last occurrence)
    const unique = new Map();
    for (const p of shop.printers) {
      const key = p.printerid || p.printerId || undefined;
      if (!key) {
        // drop legacy entries without identifiable printer id
        continue;
      }
      unique.set(key, p);
    }
    shop.printers = Array.from(unique.values());

  await shop.save();
  // Socket removed: frontend uses polling
  console.log(`[PRINTER-SYNC] shop ${shop.shop_id || shop.shopId} — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`);
  summary.perShop.push({ shopId: shop.shop_id || shop.shopId, inserted, updated, skipped });
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

module.exports = { syncPrinters, scheduledSync };
