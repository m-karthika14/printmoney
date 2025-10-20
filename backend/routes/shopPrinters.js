const express = require('express');
const router = express.Router();
const NewShop = require('../models/NewShop');

// GET all printers for a shop
router.get('/:shopId/printers', async (req, res) => {
  try {
  const shop = await NewShop.findOne({ shop_id: req.params.shopId }).lean({ virtuals: true });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const printers = (shop.printers || []).map(p => ({
      ...p,
      printerid: p.printerid || p.printerId || null,
    }));
    res.json(printers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH manualOverride for a printer
router.patch('/:shopId/printers/:printerid', async (req, res) => {
  try {
  const shop = await NewShop.findOne({ shop_id: req.params.shopId });
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const printer = shop.printers.find(p => p.printerid === req.params.printerid);
    if (!printer) return res.status(404).json({ message: 'Printer not found' });
    // Merge manualOverride fields
    const patch = (req.body && req.body.manualOverride) ? req.body.manualOverride : {};
    printer.manualOverride = {
      ...printer.manualOverride,
      ...patch
    };
    await shop.save();
    res.json(printer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
