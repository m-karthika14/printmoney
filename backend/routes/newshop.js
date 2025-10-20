const express = require('express');
const router = express.Router();
const NewShop = require('../models/NewShop');
// ...existing code...

// Helper: resolve by public code only (shop_id string)
async function resolveShopByAny(idOrCode) {
	if (!idOrCode) return null;
	// Enforce shop_id (public code) lookup only for external routes.
	return await NewShop.findOne({ shop_id: idOrCode });
}

// GET: fetch only pricing.fixedDocuments for a shop
router.get('/:id/fixed-documents', async (req, res) => {
	try {
 		const shop = await resolveShopByAny(req.params.id);
 		if (!shop) {
 			return res.status(404).json({ message: 'Shop not found' });
 		}
 		res.json(shop.pricing.fixedDocuments || []);
 	} catch (error) {
 		res.status(400).json({ message: error.message });
 	}
});

// PATCH: update only pricing.fixedDocuments for a shop
router.patch('/:id/fixed-documents', async (req, res) => {
	try {
 		const { fixedDocuments } = req.body;
 		if (!Array.isArray(fixedDocuments)) {
 			return res.status(400).json({ message: 'fixedDocuments must be an array' });
 		}
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
 			{ $set: { 'pricing.fixedDocuments': fixedDocuments } },
 			{ new: true, runValidators: true }
 		);
 		if (!shop) {
 			return res.status(404).json({ message: 'Shop not found' });
 		}
 		res.json(shop.pricing.fixedDocuments);
 	} catch (error) {
 		res.status(400).json({ message: error.message });
 	}
});
// GET all newshops
router.get('/', async (req, res) => {
	try {
		const shops = await NewShop.find();
		res.json(shops);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// GET newshop by ID
router.get('/:id', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// POST create newshop
router.post('/', async (req, res) => {
	try {
		const shop = new NewShop(req.body);
		const savedShop = await shop.save();
		res.status(201).json(savedShop);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// PUT update newshop
router.put('/:id', async (req, res) => {
	try {
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			req.body,
			{ new: true, runValidators: true }
		);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// DELETE newshop
router.delete('/:id', async (req, res) => {
	try {
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });
		const shop = await NewShop.findByIdAndDelete(shopRaw._id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json({ message: 'Shop deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// GET: fetch only pricing.customDiscounts for a shop
router.get('/:id/discounts', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop.pricing.customDiscounts || []);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// PATCH: update only pricing.customDiscounts for a shop
router.patch('/:id/discounts', async (req, res) => {
	try {
		const { customDiscounts } = req.body;
		if (!Array.isArray(customDiscounts)) {
			return res.status(400).json({ message: 'customDiscounts must be an array' });
		}
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: { 'pricing.customDiscounts': customDiscounts } },
			{ new: true, runValidators: true }
		);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop.pricing.customDiscounts);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

module.exports = router;
