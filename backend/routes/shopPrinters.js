const express = require('express');
const router = express.Router();
const NewShop = require('../models/NewShop');
const { scheduledSync } = require('../utils/printerSync');
const FinalJob = require('../models/FinalJob');

// Helper: resolve shop by shop_id OR _id
async function resolveShopByAny(idOrCode) {
  if (!idOrCode) return null;
  const HEX24 = /^[a-fA-F0-9]{24}$/;
  if (HEX24.test(idOrCode)) {
    try { const byId = await NewShop.findById(idOrCode); if (byId) return byId; } catch (e) {}
  }
  return await NewShop.findOne({ $or: [{ shop_id: idOrCode }, { shopId: idOrCode }] });
}

// GET all printers for a shop, returning merged finalValues (agent + manual)
router.get('/:shopId/printers', async (req, res) => {
  try {
    const shop = await resolveShopByAny(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const printers = (shop.printers || []).map(p => {
      const agentCap = (p.agentDetected && Array.isArray(p.agentDetected.capabilities) ? p.agentDetected.capabilities[0] : (p.agentDetected && p.agentDetected.capabilities) ) || {};
      const manualCap = (p.manualOverride && Array.isArray(p.manualOverride.capabilities) ? p.manualOverride.capabilities[0] : (p.manualOverride && p.manualOverride.capabilities)) || {};
      const finalType = manualCap.type || agentCap.type || 'B/W';
      const finalDuplex = (typeof manualCap.duplex !== 'undefined' && manualCap.duplex !== null) ? !!manualCap.duplex : !!agentCap.duplex;
      const finalPaperSizes = (Array.isArray(manualCap.paperSizes) && manualCap.paperSizes.length) ? manualCap.paperSizes : (Array.isArray(agentCap.paperSizes) ? agentCap.paperSizes : []);
      return {
        ...p.toObject ? p.toObject() : p,
        printerid: p.printerid || p.printerId || null,
        manualStatus: p.manualStatus || 'on',
        finalValues: {
          name: (p.manualOverride && p.manualOverride.name) || (p.agentDetected && p.agentDetected.name) || (p.printerid || p.printerId),
          type: finalType,
          duplex: finalDuplex,
          paperSizes: finalPaperSizes,
          manualStatus: p.manualStatus || 'on',
          status: p.status || (p.agentDetected && p.agentDetected.status) || 'offline'
        }
      };
    });
    res.json(printers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH manualStatus for a specific printer (by printerid)
// Persist exactly the shopkeeper-requested manualStatus (on/off/pending_off).
router.patch('/:shopId/printers/:printerid/manualStatus', async (req, res) => {
  try {
    const { manualStatus } = req.body || {};
    if (!manualStatus || !['on','off','pending_off'].includes(manualStatus)) return res.status(400).json({ message: 'Invalid manualStatus' });
    const shop = await resolveShopByAny(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const printers = shop.printers || [];
    const idx = printers.findIndex(p => (p.printerid || p.printerId) === req.params.printerid);
    if (idx === -1) return res.status(404).json({ message: 'Printer not found' });
    const printer = printers[idx];

    let nextStatus = manualStatus;
    if (manualStatus === 'off') {
      const pid = printer.printerid || printer.printerId;
      const pname = printer.agentDetected?.name;
      const canonicalShopId = shop.shop_id || req.params.shopId;
      const activeJob = await FinalJob.findOne({
        shop_id: canonicalShopId,
        $or: [
          { printerid: pid },
          { assigned_printer: pid },
          ...(pname ? [{ assigned_printer: pname }] : [])
        ],
        job_status: { $in: ['pending', 'printing', 'alloted', 'processing'] }
      }).lean();
      if (activeJob) nextStatus = 'pending_off';
    }

    const setObj = {};
    setObj[`printers.${idx}.manualStatus`] = nextStatus;
    const updated = await NewShop.findByIdAndUpdate(shop._id, { $set: setObj }, { new: true }).lean();
    const outPrinter = (updated.printers || [])[idx];
    res.json({ success: true, printer: outPrinter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH manual override partial merge for a printer
router.patch('/:shopId/printers/:printerid', async (req, res) => {
  try {
    const payload = req.body || {};
    const shop = await resolveShopByAny(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const idx = (shop.printers || []).findIndex(p => (p.printerid || p.printerId) === req.params.printerid);
    if (idx === -1) return res.status(404).json({ message: 'Printer not found' });
    const existing = shop.printers[idx] || {};
    // Build merged manualOverride object
    const incoming = payload.manualOverride || {};
    const merged = Object.assign({}, existing.manualOverride || {});
    // Merge simple fields
    if (typeof incoming.name !== 'undefined') merged.name = incoming.name;
    if (typeof incoming.notes !== 'undefined') merged.notes = incoming.notes;
    if (typeof incoming.useAgentValues !== 'undefined') merged.useAgentValues = !!incoming.useAgentValues;
    // Capabilities: partial merge into first element
    const capExisting = (existing.manualOverride && Array.isArray(existing.manualOverride.capabilities) && existing.manualOverride.capabilities[0]) || {};
    const capIncoming = (incoming.capabilities && Array.isArray(incoming.capabilities) && incoming.capabilities[0]) || incoming.capabilities || {};
    const capMerged = Object.assign({}, capExisting, capIncoming);
    if (Object.keys(capMerged).length) merged.capabilities = [capMerged];

    // Prepare $set object for updating only that printer's manualOverride
    const setObj = {};
    setObj[`printers.${idx}.manualOverride`] = merged;
    const updatedShop = await NewShop.findByIdAndUpdate(shop._id, { $set: setObj }, { new: true }).lean();
    const printer = (updatedShop.printers || [])[idx];
    res.json({ success: true, printer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST sync: update agentDetected from an external source (simulated here)
router.post('/:shopId/printers/:printerid/sync', async (req, res) => {
  try {
    // Simulate agent data or integrate with actual agent service
    const latestData = req.body.latestData || {
      name: 'HP LaserJet Professional M1136 MFP',
      status: 'online',
      capabilities: [{ type: 'Color', duplex: true, paperSizes: ['A4','Letter'] }]
    };
    const shop = await resolveShopByAny(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const idx = (shop.printers || []).findIndex(p => (p.printerid || p.printerId) === req.params.printerid);
    if (idx === -1) return res.status(404).json({ message: 'Printer not found' });
    const setObj = {};
    setObj[`printers.${idx}.agentDetected`] = latestData;
    setObj[`printers.${idx}.lastUpdate`] = new Date();
    const updated = await NewShop.findByIdAndUpdate(shop._id, { $set: setObj }, { new: true }).lean();
    const printer = (updated.printers || [])[idx];
    res.json({ success: true, printer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET unified paper sizes across the shop's printers
router.get('/:shopId/paper-sizes', async (req, res) => {
  try {
    const shop = await resolveShopByAny(req.params.shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const sizes = new Set();
    for (const p of (shop.printers || [])) {
      const cap = (p.agentDetected && (Array.isArray(p.agentDetected.capabilities) ? p.agentDetected.capabilities[0] : p.agentDetected.capabilities)) || {};
      if (Array.isArray(cap.paperSizes)) cap.paperSizes.forEach(s => sizes.add(s));
      const mcap = (p.manualOverride && (Array.isArray(p.manualOverride.capabilities) ? p.manualOverride.capabilities[0] : p.manualOverride.capabilities)) || {};
      if (Array.isArray(mcap.paperSizes)) mcap.paperSizes.forEach(s => sizes.add(s));
    }
    res.json({ sizes: Array.from(sizes) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
