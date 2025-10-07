const express = require('express');
const router = express.Router();

// PATCH add/update printers to a shop (onboarding)
router.patch('/:id/printers', async (req, res) => {
	try {
		console.log('PATCH /:id/printers called');
		console.log('Request body:', req.body);
		const printers = req.body.printers;
		if (!Array.isArray(printers)) {
			console.log('Printers is not an array:', printers);
			return res.status(400).json({ message: 'Printers must be an array' });
		}
		const shop = await NewShop.findByIdAndUpdate(
			req.params.id,
			{ $set: { printers: printers } },
			{ new: true, runValidators: true }
		);
		console.log('Shop after update:', shop);
		if (!shop) {
			console.log('Shop not found for id:', req.params.id);
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop.printers);
	} catch (error) {
		console.log('Error in PATCH /:id/printers:', error);
		res.status(400).json({ message: error.message });
	}
});
// PATCH update only payment (onboarding)
router.patch('/:id/payment', async (req, res) => {
	try {
		// Only update payment.method, payment.details, payment.status
		const update = {
			'payment.method': req.body.method,
			'payment.details': req.body.details,
			'payment.status': req.body.status || 'pending',
			'payment.completed': req.body.completed || false
		};
		const shop = await NewShop.findByIdAndUpdate(
			req.params.id,
			{ $set: update },
			{ new: true, runValidators: true }
		);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json(shop.payment);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// PATCH update only printers (manual override + useAgentValues)
router.patch('/:id/printer/:printerId', async (req, res) => {
	try {
		const { manualOverride, useAgentValues } = req.body;
		const shop = await NewShop.findOneAndUpdate(
			{ _id: req.params.id, 'printers.printerId': req.params.printerId },
			{
				$set: {
					'printers.$.manualOverride': manualOverride,
					'printers.$.useAgentValues': useAgentValues
				}
			},
			{ new: true, runValidators: true }
		);
		if (!shop) {
			return res.status(404).json({ message: 'Shop or printer not found' });
		}
		// Return updated printer object (including .activeConfig virtual)
		const printer = shop.printers.find(p => p.printerId === req.params.printerId);
		res.json(printer);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

// PATCH update only services (onboarding)
router.patch('/:id/services', async (req, res) => {
	try {
			// Replace services array with frontend array
			const services = req.body.services;
			if (!Array.isArray(services)) {
				return res.status(400).json({ message: 'Services must be an array' });
			}
			// Validate each service object
			for (const s of services) {
				if (!s.id || !s.name) {
					return res.status(400).json({ message: 'Each service must have id and name' });
				}
				if (typeof s.price === 'undefined') {
					return res.status(400).json({ message: 'Each service must have a price' });
				}
			}
			const shop = await NewShop.findByIdAndUpdate(
				req.params.id,
				{ services },
				{ new: true, runValidators: true }
			);
			if (!shop) {
				return res.status(404).json({ message: 'Shop not found' });
			}
			res.json(shop.services);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

const NewShop = require('../models/NewShop');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// PATCH update agent status and installedAt (onboarding agent install)
router.patch('/:id/agent', async (req, res) => {
	try {
		const shop = await NewShop.findByIdAndUpdate(
			req.params.id,
			{ agent: { status: req.body.status, installedAt: req.body.installedAt } },
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
// PATCH update only the plan for a shop (onboarding)
router.patch('/:id/plan', async (req, res) => {
	try {
		const shop = await NewShop.findByIdAndUpdate(
			req.params.id,
			{ plan: req.body.plan },
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
		const shop = await NewShop.findById(req.params.id);
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
		// Generate shopId: 1 uppercase letter + 5 digits + 1 lowercase letter
		function generateShopId() {
			const upper = String.fromCharCode(65 + Math.floor(Math.random() * 26));
			const digits = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
			const lower = String.fromCharCode(97 + Math.floor(Math.random() * 26));
			return `${upper}${digits}${lower}`;
		}
		// Generate API key
		function generateApiKey() {
			return crypto.randomBytes(16).toString('hex');
		}
		// Hash password
		const hashedPassword = await bcrypt.hash(req.body.password, 10);
		const shop = new NewShop({
			...req.body,
			password: hashedPassword,
			shopId: generateShopId(),
			apiKey: generateApiKey()
		});
		const savedShop = await shop.save();
		res.status(201).json(savedShop);
	} catch (error) {
		res.status(400).json({ message: error.message || 'Registration failed' });
	}
});

// PUT update newshop
router.put('/:id', async (req, res) => {
	try {
		const shop = await NewShop.findByIdAndUpdate(
			req.params.id,
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
		const shop = await NewShop.findByIdAndDelete(req.params.id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.json({ message: 'Shop deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});


// POST login: check email and password, return shop details if valid
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password required' });
		}
		const shop = await NewShop.findOne({ email });
		if (!shop) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}
		const bcrypt = require('bcryptjs');
		const valid = await bcrypt.compare(password, shop.password);
		if (!valid) {
			return res.status(401).json({ message: 'Invalid email or password' });
		}
		// Remove password from response
		const shopObj = shop.toObject();
		delete shopObj.password;
		res.json({ message: 'Login successful', shop: shopObj });
	} catch (error) {
		res.status(500).json({ message: error.message || 'Login failed' });
	}
});

// Catch-all error handler for this router
router.use((err, req, res, next) => {
	res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = router;
