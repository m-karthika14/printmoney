const express = require('express');
const router = express.Router();
const NewShop = require('../models/NewShop');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { scheduledSync } = require('../utils/printerSync');
const FinalJob = require('../models/FinalJob');
// Helper: resolve shop by shop_id OR _id (shared helper used across routes)
async function resolveShopByAny(idOrCode) {
	if (!idOrCode) return null;
	const HEX24 = /^[a-fA-F0-9]{24}$/;
	if (HEX24.test(idOrCode)) {
		try { const byId = await NewShop.findById(idOrCode); if (byId) return byId; } catch (e) {}
	}
	return await NewShop.findOne({ $or: [{ shop_id: idOrCode }, { shopId: idOrCode }] });
}
// Legacy model not used after embedding into NewShop.dailystats map
// GET shop by canonical shop_id (new) and keep legacy (shopId) for compatibility
router.get('/by-shop/:shop_id', async (req, res) => {
	try {
		const shop = await NewShop.findOne({ shop_id: req.params.shop_id });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const obj = shop.toObject();
		delete obj.password;
		res.json(obj);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}

});


// PATCH update paperSizePricing for a shop
router.patch('/shop/:id/paper-size-pricing', async (req, res) => {
	try {
		console.log('[PaperSizePricing] PATCH called for shopId:', req.params.id);
		console.log('[PaperSizePricing] Received body:', JSON.stringify(req.body, null, 2));
		const { paperSizePricing } = req.body;
		if (!paperSizePricing || typeof paperSizePricing !== 'object') {
			console.log('[PaperSizePricing] Invalid paperSizePricing data:', paperSizePricing);
			return res.status(400).json({ message: 'Invalid paperSizePricing data' });
		}
		const idOrCode = req.params.id;
		const shopRaw = await resolveShopByAny(idOrCode);
		if (!shopRaw) {
			return res.status(404).json({ message: 'Shop not found' });
		}

		// Build $set object to merge provided sizes/fields into existing paperSizePricing
		const setObj = {};
		for (const sizeKey of Object.keys(paperSizePricing)) {
			const sizeObj = paperSizePricing[sizeKey];
			if (sizeObj && typeof sizeObj === 'object') {
				for (const field of ['bwSingle', 'colorSingle', 'bwDouble', 'colorDouble']) {
					if (typeof sizeObj[field] !== 'undefined') {
						// coerce to number when possible
						const val = sizeObj[field];
						setObj[`pricing.paperSizePricing.${sizeKey}.${field}`] = (typeof val === 'string' && val !== '') ? parseFloat(val) : val;
					}
				}
			}
		}

		if (Object.keys(setObj).length === 0) {
			return res.status(400).json({ message: 'No valid fields to update in paperSizePricing' });
		}

		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: setObj },
			{ new: true, runValidators: true }
		);
		if (!shop) {
			console.log('[PaperSizePricing] Shop not found for id:', idOrCode);
			return res.status(404).json({ message: 'Shop not found' });
		}
		console.log('[PaperSizePricing] Updated paperSizePricing:', JSON.stringify(shop.pricing.paperSizePricing, null, 2));
		res.status(200).json({ message: 'Paper size pricing updated', paperSizePricing: shop.pricing.paperSizePricing });
	} catch (error) {
		console.error('Error updating paperSizePricing:', error);
		res.status(500).json({ message: 'Server error while updating paperSizePricing' });
	}
});
// ...existing code...

// GET pricing details for a shop
router.get('/shop/:id/pricing', async (req, res) => {
    try {
		const shop = await resolveShopByAny(req.params.id);
        if (!shop) {
            return res.status(404).json({ message: 'Shop not found' });
        }
        res.status(200).json({ pricing: shop.pricing });
    } catch (error) {
        console.error('Error fetching pricing:', error);
        res.status(500).json({ message: 'Server error while fetching pricing' });
    }
});

// GET /api/shops/shop/:shopId/dashboard
router.get('/shop/:shopId/dashboard', async (req, res) => {
	try {
		const shopId = req.params.shopId;
		// Resolve shop by canonical id
	const shop = await NewShop.findOne({ shop_id: shopId }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });

		const canonical = shop.shop_id || shopId;

		// IST day key for calendar-day lookups in embedded maps
		let todayRevenue = 0;
		let todayJobs = 0;
		try {
			const { getIstDayKey } = require('../utils/ist');
			const dayKey = getIstDayKey(new Date());
			const trDaily = (shop.totalRevenue && shop.totalRevenue.daily) || {};
			const dsMap = shop.dailystats || {};
			const trEntry = trDaily[dayKey];
			todayRevenue = (trEntry && typeof trEntry.totalRevenue === 'number') ? trEntry.totalRevenue : 0;
			const dsEntry = dsMap[dayKey];
			todayJobs = (dsEntry && typeof dsEntry.totalJobsCompleted === 'number') ? dsEntry.totalJobsCompleted : (dsEntry && typeof dsEntry.completedCount === 'number' ? dsEntry.completedCount : 0);
		} catch (e) { /* ignore and keep zeros */ }

		// Rolling 24-hour window counts using FinalJob (completed within last 24 hours)
		const now = new Date();
		const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const prevSince24 = new Date(Date.now() - 48 * 60 * 60 * 1000);
		const prevUntil = since24;

		// completed in last 24h, pending now, and completed in previous 24h (for percent change)
		const [completedToday, pendingNow, printingNow, completedNow, yesterdayCompleted] = await Promise.all([
			FinalJob.countDocuments({
				shop_id: canonical,
				job_status: 'completed',
				$or: [
					{ completed_at: { $gte: since24 } },
					{ createdAt: { $gte: since24 } }
				]
			}),
			FinalJob.countDocuments({ shop_id: canonical, job_status: 'pending' }),
			FinalJob.countDocuments({ shop_id: canonical, job_status: 'printing' }),
			FinalJob.countDocuments({ shop_id: canonical, job_status: 'completed' }),
			FinalJob.countDocuments({
				shop_id: canonical,
				job_status: 'completed',
				$or: [
					{ completed_at: { $gte: prevSince24, $lt: prevUntil } },
					{ createdAt: { $gte: prevSince24, $lt: prevUntil } }
				]
			})
		]);

		const changePercent = (() => {
			// If yesterday is zero, show +0% when both zero, +100% when today>0 (can't compute ratio),
			// otherwise compute (today - yesterday)/yesterday * 100
			if (yesterdayCompleted === 0) {
				if (completedToday === 0) return '+0%';
				return '+100%';
			}
			const diff = completedToday - yesterdayCompleted;
			const pct = Math.round((diff / Math.abs(yesterdayCompleted)) * 100);
			const sign = pct > 0 ? '+' : '';
			return `${sign}${pct}%`;
		})();

		// Printers summary + list
		const printers = Array.isArray(shop.printers) ? shop.printers : [];
		const totalPrinters = printers.length;
		const onlinePrinters = printers.filter(p => (p.status || '').toLowerCase() === 'online').length;
		const printerList = printers.map(p => ({
			name: p.agentDetected?.name || p.printerid || p.printerId || 'Unknown',
			type: Array.isArray(p.agentDetected?.capabilities) && p.agentDetected.capabilities[0] ? (p.agentDetected.capabilities[0].type || '') : '',
			status: p.status || 'offline'
		}));

		// Recent jobs: prefer one per status (completed, printing, pending), else fill by latest
		const latestByStatus = await Promise.all([
			FinalJob.findOne({ shop_id: canonical, job_status: 'completed' }).sort({ updatedAt: -1 }).lean(),
			FinalJob.findOne({ shop_id: canonical, job_status: 'printing' }).sort({ updatedAt: -1 }).lean(),
			FinalJob.findOne({ shop_id: canonical, job_status: 'pending' }).sort({ updatedAt: -1 }).lean(),
		]);
		const picked = [];
		const seen = new Set();
		for (const j of latestByStatus) {
			if (j && !seen.has(j.job_number)) { picked.push(j); seen.add(j.job_number); }
		}
		if (picked.length < 3) {
			const extra = await FinalJob.find({ shop_id: canonical }).sort({ updatedAt: -1 }).limit(10).lean();
			for (const j of extra) { if (picked.length >= 3) break; if (!seen.has(j.job_number)) { picked.push(j); seen.add(j.job_number); } }
		}
		const recentJobs = picked.slice(0,3).map(j => ({
			job_number: j.job_number,
			customer: j.customer || 'guest',
			copies: (j.print_options && j.print_options.copies) ? j.print_options.copies : undefined,
			total_amount: j.total_amount || 0,
			job_status: j.job_status
		}));

				// For yesterday's value prefer the stored calendar-day snapshot in NewShop.dailystats (if available)
				// completedToday is always computed from FinalJob (rolling last 24h)
				let yesterdayFromDs = null;
				try {
						const { getIstDayKey } = require('../utils/ist');
						const yDate = new Date(); yDate.setDate(yDate.getDate() - 1);
						const dayKey = getIstDayKey(yDate);
					const ds = shop.dailystats || {};
					const entry = ds && ds[dayKey];
					const val = entry && (typeof entry.totalJobsCompleted === 'number' ? entry.totalJobsCompleted : entry.completedCount);
					if (typeof val === 'number') yesterdayFromDs = val;
				} catch (e) { /* ignore */ }

				const finalTotal = completedToday;
				const yesterdayForPercent = (typeof yesterdayFromDs === 'number') ? yesterdayFromDs : yesterdayCompleted;
				// Recompute changePercent using yesterdayForPercent
				const finalChange = (() => {
					if (yesterdayForPercent === 0) {
						if (finalTotal === 0) return '+0%';
						return '+100%';
					}
					const diff = finalTotal - yesterdayForPercent;
					const pct = Math.round((diff / Math.abs(yesterdayForPercent)) * 100);
					const sign = pct > 0 ? '+' : '';
					return `${sign}${pct}%`;
				})();

				// Prefer embedded map snapshot for calendar day revenue
				const earningsToday = todayRevenue;

				// Final payload
				res.json({
						shopName: shop.shopName,
						isOpen: typeof shop.isOpen === 'boolean' ? shop.isOpen : true,
						earningsToday,
						printJobsToday: { totalCompleted: finalTotal, changePercent: finalChange },
						pendingJobs: pendingNow,
						printers: { online: onlinePrinters, total: totalPrinters },
						recentJobs,
						printerList,
						// Compact stats per API proposal
						todayRevenue: todayRevenue,
						todayJobs: todayJobs,
						printingJobs: printingNow,
						completedJobs: completedNow,
						lifetimeRevenue: typeof shop.lifetimeRevenue === 'number' ? shop.lifetimeRevenue : 0,
						lifetimeJobsCompleted: typeof shop.lifetimeJobsCompleted === 'number' ? shop.lifetimeJobsCompleted : 0
				});
	} catch (err) {
		console.error('[DASHBOARD] Error:', err);
		res.status(500).json({ message: err.message || 'Server error' });
	}
});

// PATCH /api/shops/:shopId/isopen
router.patch('/:shopId/isopen', async (req, res) => {
	try {
		const { isOpen } = req.body || {};
		if (typeof isOpen !== 'boolean') return res.status(400).json({ message: 'isOpen boolean is required' });
	const shopId = req.params.shopId;
		const shop = await NewShop.findOneAndUpdate(
		{ shop_id: shopId },
			{ $set: { isOpen } },
			{ new: true }
		).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		// Socket removed: frontend uses polling
		res.json({ success: true, isOpen: shop.isOpen });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// PATCH update pricing details for a shop
router.patch('/shop/:id/pricing', async (req, res) => {
    try {
		// Support two shapes:
		// 1) legacy top-level fields: { bwSingle, colorSingle, bwDouble, colorDouble }
		// 2) new shape: { paperSizePricing: { A4: { bwSingle, colorSingle, bwDouble, colorDouble }, ... } }
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			return res.status(404).json({ message: 'Shop not found' });
		}

		// Log incoming body for easier debugging when clients hit 400
		console.log('[Pricing PATCH] shop:', req.params.id, 'body:', JSON.stringify(req.body, null, 2));

		const updates = {};

		// If paperSizePricing provided, accept any size keys (A4, A3, etc.) and merge provided fields
		if (req.body.paperSizePricing && typeof req.body.paperSizePricing === 'object') {
			const psp = req.body.paperSizePricing;
			for (const sizeKey of Object.keys(psp)) {
				const sizeObj = psp[sizeKey] || {};
				if (sizeObj && typeof sizeObj === 'object') {
					for (const field of ['bwSingle', 'colorSingle', 'bwDouble', 'colorDouble']) {
						// Use hasOwnProperty to allow explicit null/0/"" values to be handled
						if (Object.prototype.hasOwnProperty.call(sizeObj, field)) {
							const raw = sizeObj[field];
							// Coerce numeric strings to numbers; treat empty string as 0
							let val = raw;
							if (typeof raw === 'string') {
								val = raw === '' ? 0 : parseFloat(raw);
								if (Number.isNaN(val)) val = 0;
							}
							updates[`pricing.paperSizePricing.${sizeKey}.${field}`] = val;
						}
					}
				}
			}
		} else {
			// Backward compatibility: legacy top-level fields -> write into A4
			const { bwSingle, colorSingle, bwDouble, colorDouble } = req.body || {};
			if (Object.prototype.hasOwnProperty.call(req.body || {}, 'bwSingle')) {
				const raw = bwSingle;
				let val = raw;
				if (typeof raw === 'string') {
					val = raw === '' ? 0 : parseFloat(raw);
					if (Number.isNaN(val)) val = 0;
				}
				updates['pricing.paperSizePricing.A4.bwSingle'] = val;
			}
			if (Object.prototype.hasOwnProperty.call(req.body || {}, 'colorSingle')) {
				const raw = colorSingle;
				let val = raw;
				if (typeof raw === 'string') {
					val = raw === '' ? 0 : parseFloat(raw);
					if (Number.isNaN(val)) val = 0;
				}
				updates['pricing.paperSizePricing.A4.colorSingle'] = val;
			}
			if (Object.prototype.hasOwnProperty.call(req.body || {}, 'bwDouble')) {
				const raw = bwDouble;
				let val = raw;
				if (typeof raw === 'string') {
					val = raw === '' ? 0 : parseFloat(raw);
					if (Number.isNaN(val)) val = 0;
				}
				updates['pricing.paperSizePricing.A4.bwDouble'] = val;
			}
			if (Object.prototype.hasOwnProperty.call(req.body || {}, 'colorDouble')) {
				const raw = colorDouble;
				let val = raw;
				if (typeof raw === 'string') {
					val = raw === '' ? 0 : parseFloat(raw);
					if (Number.isNaN(val)) val = 0;
				}
				updates['pricing.paperSizePricing.A4.colorDouble'] = val;
			}
		}

		if (Object.keys(updates).length === 0) {
			console.warn('[Pricing PATCH] No valid fields found to update. Body was:', JSON.stringify(req.body));
			return res.status(400).json({ message: 'Incomplete pricing data - no valid fields found', received: req.body });
		}

		const updatedShop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: updates },
			{ new: true }
		);

		if (!updatedShop) {
			return res.status(404).json({ message: 'Shop not found' });
		}

		res.status(200).json({ message: 'Pricing updated successfully', pricing: updatedShop.pricing });
    } catch (error) {
        console.error('Error updating pricing:', error);
        res.status(500).json({ message: 'Server error while updating pricing' });
    }
});

// PATCH update services for a shop
router.patch('/shop/:id/services', async (req, res) => {
    try {
        console.log('[BACKEND] Services update request received for shop ID:', req.params.id);
        console.log('[BACKEND] Request body:', JSON.stringify(req.body, null, 2));
        
        const { services } = req.body;
        if (!services || !Array.isArray(services)) {
            console.error('[BACKEND] Invalid services data - not an array:', services);
            return res.status(400).json({ message: 'Services must be provided as an array' });
        }
        
        console.log('[BACKEND] Services array length:', services.length);
        console.log('[BACKEND] Sample service item:', services[0]);
        
		// Resolve shop by id or shop code
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			console.error('[BACKEND] Shop not found with ID:', req.params.id);
			return res.status(404).json({ message: 'Shop not found' });
		}
		console.log('[BACKEND] Found shop:', shopRaw.shopName || shopRaw.email);
		console.log('[BACKEND] Current services count:', shopRaw.services?.length || 0);
		// Update services
		const updatedShop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: { services: services } },
			{ new: true }
		);

        if (!updatedShop) {
            console.error('[BACKEND] Failed to update shop with ID:', req.params.id);
            return res.status(404).json({ message: 'Shop not found after update attempt' });
        }
        
        console.log('[BACKEND] Services updated successfully');
        console.log('[BACKEND] Updated services count:', updatedShop.services?.length || 0);
        
        res.status(200).json({ 
            message: 'Services updated successfully', 
            services: updatedShop.services,
            count: updatedShop.services?.length || 0
        });
    } catch (error) {
        console.error('[BACKEND] Error updating services:', error);
        res.status(500).json({ message: `Server error while updating services: ${error.message}` });
    }
});

// PATCH update shop profile (name, shopId, description, phone, email, website, isOpen)
router.patch('/:id/profile', async (req, res) => {
	try {
		console.log('PATCH /:id/profile body:', req.body);
		const updateFields = {};
		const allowed = ['name', 'shopId', 'description', 'phone', 'email', 'website', 'isOpen', 'address'];
		for (const key of allowed) {
			if (key in req.body) updateFields[key] = req.body[key];
		}

		// Handle workingHours update with nested isClosed
		if ('workingHours' in req.body && typeof req.body.workingHours === 'object') {
			const allDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
			for (const day of allDays) {
				const wh = req.body.workingHours[day] || {};
				const openVal = typeof wh.open !== 'undefined' ? wh.open : '';
				const closeVal = typeof wh.close !== 'undefined' ? wh.close : '';
				// Always set isClosed true if both open and close are empty
				const isClosedVal = (!openVal && !closeVal) ? true : false;
				updateFields[`workingHours.${day}.open`] = openVal;
				updateFields[`workingHours.${day}.close`] = closeVal;
				updateFields[`workingHours.${day}.isClosed`] = isClosedVal;
			}
		}

		const base = await resolveShopByAny(req.params.id);
		if (!base) return res.status(404).json({ message: 'Shop not found' });
		const shop = await NewShop.findByIdAndUpdate(
			base._id,
			{ $set: updateFields },
			{ new: true, runValidators: true }
		);
		console.log('PATCH /:id/profile updated shop:', shop);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		// Ensure isOpen is always present in response
		if (typeof shop.isOpen === 'undefined') {
			shop.isOpen = true;
			await shop.save();
		}
		res.json(shop);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});

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
		// Resolve shop by Mongo _id or shop code
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			console.log('Shop not found for id:', req.params.id);
			return res.status(404).json({ message: 'Shop not found' });
		}
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
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
		// Normalize incoming method values (frontend may send lowercase variants)
		const rawMethod = (req.body.method || '').toString();
		let method = rawMethod;
		if (/^upi$/i.test(rawMethod)) method = 'UPI';
		else if (/^card$/i.test(rawMethod)) method = 'Card';
		else if (/^netbanking$/i.test(rawMethod) || /^netbank$/i.test(rawMethod)) method = 'NetBanking';
		else if (/^cash$/i.test(rawMethod)) method = 'cash';
		else if (/^credit$/i.test(rawMethod)) method = 'credit';

		const details = (typeof req.body.details === 'object' && req.body.details) ? req.body.details : (req.body.details ? { details: req.body.details } : {});
		const status = req.body.status || 'pending';
		const completed = typeof req.body.completed === 'boolean' ? req.body.completed : !!req.body.completed;

		const update = {
			'payment.method': method,
			'payment.details': details,
			'payment.status': status,
			'payment.completed': completed
		};

		console.log('[Payment PATCH] shop:', req.params.id, 'rawMethod:', rawMethod, 'normalized:', method, 'body:', JSON.stringify(req.body));

		// Resolve by any identifier to tolerate Mongo _id or shop code
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
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

// PATCH update only printers (manual override + useAgentValues) [back-compat endpoint]
// Accepts req.params.id as Mongo _id or public shop_id. Matches printer by printerid or printerId.
// Performs a partial merge into printers[idx].manualOverride and supports repeated edits safely.
router.patch('/:id/printer/:printerId', async (req, res) => {
	try {
		const { manualOverride, useAgentValues } = req.body || {};
		// Resolve shop by any identifier for robustness
		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });

		// Locate printer index by either legacy printerId or canonical printerid
		const target = req.params.printerId;
		const printers = shopRaw.printers || [];
		const idx = printers.findIndex(p => (p.printerid || p.printerId) === target);
		if (idx === -1) return res.status(404).json({ message: 'Printer not found' });

		const current = printers[idx] || {};
		const baseManual = (current.manualOverride && current.manualOverride.toObject ? current.manualOverride.toObject() : current.manualOverride) || {};
		const incoming = manualOverride || {};

		// Merge scalar override fields
		const merged = Object.assign({}, baseManual);
		if (Object.prototype.hasOwnProperty.call(incoming, 'name')) merged.name = incoming.name;
		if (Object.prototype.hasOwnProperty.call(incoming, 'notes')) merged.notes = incoming.notes;

				// Merge capabilities into first element; normalize type to allow manual 'Color+B/W'
				const existingCap = (baseManual.capabilities && Array.isArray(baseManual.capabilities) && baseManual.capabilities[0]) || {};
				const incCap = (incoming.capabilities && (Array.isArray(incoming.capabilities) ? incoming.capabilities[0] : incoming.capabilities)) || {};
				const capMerged = Object.assign({}, existingCap, incCap);
				// normType: preserve 'Color+B/W' when explicitly provided by manual overrides or incoming values.
				const normType = (val) => {
					const s = String(val || '').toLowerCase();
					// Accept explicit tokens like 'color+bw' or 'color+b/w' or forms containing both color and bw
					if (/color\W*bw/.test(s) || (s.includes('color') && (s.includes('bw') || s.includes('b/w') || s.includes('grayscale') || s.includes('black')))) return 'Color+B/W';
					if (/color/.test(s)) return 'Color';
					return 'B/W';
				};
				if (typeof capMerged.type !== 'undefined') capMerged.type = normType(capMerged.type);
				if (Object.keys(capMerged).length > 0) merged.capabilities = [capMerged];

		// Build atomic $set update
		const setObj = {};
		setObj[`printers.${idx}.manualOverride`] = merged;
		if (typeof useAgentValues !== 'undefined') {
			setObj[`printers.${idx}.useAgentValues`] = !!useAgentValues;
		}
		// Ensure canonical printerid is set for consistency if only legacy printerId exists
		if (!current.printerid && current.printerId) {
			setObj[`printers.${idx}.printerid`] = current.printerId;
		}

		const updated = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: setObj },
			{ new: true, runValidators: true }
		).lean();
		const out = (updated.printers || [])[idx];
		return res.json({ success: true, printer: out });
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
});

// --- Printers API (by shopId string) ---

// GET /api/shops/:id/printers  (accepts Mongo _id or public shop_id); returns printers with merged finalValues
router.get('/:id/printers', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.id);
		if (!shop) return res.status(404).json({ error: 'Shop not found' });

		const printers = (shop.printers || []).map((p) => {
			const toObj = p.toObject ? p.toObject() : p;
			// Normalize capability containers (support either array[0] or single object)
			const agentCap = (toObj.agentDetected?.capabilities?.[0]) || toObj.agentDetected?.capabilities || {};
			const manualCap = (toObj.manualOverride?.capabilities?.[0]) || toObj.manualOverride?.capabilities || {};

						// Allow manual values to specify 'Color+B/W' while agent values remain two-way.
						const normType = (val) => {
							const s = String(val || '').toLowerCase();
							if (/color\W*bw/.test(s) || (s.includes('color') && (s.includes('bw') || s.includes('b/w') || s.includes('grayscale') || s.includes('black')))) return 'Color+B/W';
							if (/color/.test(s)) return 'Color';
							return 'B/W';
						};
						const finalType = manualCap.type ? normType(manualCap.type) : agentCap.type ? normType(agentCap.type) : 'B/W';
			const finalDuplex = (typeof manualCap.duplex !== 'undefined') ? !!manualCap.duplex : !!agentCap.duplex;
			const finalPaperSizes = (Array.isArray(manualCap.paperSizes) && manualCap.paperSizes.length)
				? manualCap.paperSizes
				: (Array.isArray(agentCap.paperSizes) ? agentCap.paperSizes : []);

			return {
				...toObj,
				printerid: toObj.printerid || toObj.printerId || null,
				finalValues: {
					name: toObj.manualOverride?.name || toObj.agentDetected?.name || (toObj.printerid || toObj.printerId),
					type: finalType,
					duplex: finalDuplex,
					paperSizes: finalPaperSizes,
					manualStatus: toObj.manualStatus,
					status: toObj.status
				}
			};
		});

		res.json({ printers });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// PATCH /api/shops/:shopId/printers/:printerId  (update manualOverride only; partial merge)
router.patch('/:shopId/printers/:printerId', async (req, res) => {
	try {
		const { manualOverride } = req.body || {};
		const shop = await NewShop.findOne({ shop_id: req.params.shopId });
		if (!shop) return res.status(404).json({ error: 'Shop not found' });
		const idx = (shop.printers || []).findIndex(p => (p.printerid || p.printerId) === req.params.printerId);
		if (idx === -1) return res.status(404).json({ error: 'Printer not found' });

		const printer = shop.printers[idx] || {};
		const incoming = manualOverride || {};
		const baseManual = (printer.manualOverride && printer.manualOverride.toObject ? printer.manualOverride.toObject() : printer.manualOverride) || {};
		const merged = Object.assign({}, baseManual, incoming);

				// Capabilities: partial merge into first element; normalize type but preserve 'Color+B/W' for manual
				const existingCap = (baseManual.capabilities && Array.isArray(baseManual.capabilities) && baseManual.capabilities[0]) || {};
				const incCap = (incoming.capabilities && (Array.isArray(incoming.capabilities) ? incoming.capabilities[0] : incoming.capabilities)) || {};
				const normType = (val) => {
					const s = String(val || '').toLowerCase();
					if (/color\W*bw/.test(s) || (s.includes('color') && (s.includes('bw') || s.includes('b/w') || s.includes('grayscale') || s.includes('black')))) return 'Color+B/W';
					if (/color/.test(s)) return 'Color';
					return 'B/W';
				};
				const capMerged = Object.assign({}, existingCap, incCap);
				if (typeof capMerged.type !== 'undefined') capMerged.type = normType(capMerged.type);
				if (Object.keys(capMerged).length > 0) merged.capabilities = [capMerged];

		const setObj = {};
		setObj[`printers.${idx}.manualOverride`] = merged;
		// keep printerid populated if only printerId exists
		if (!(printer.printerid) && printer.printerId) setObj[`printers.${idx}.printerid`] = printer.printerId;

		const updated = await NewShop.findByIdAndUpdate(shop._id, { $set: setObj }, { new: true }).lean();
		const outPrinter = (updated.printers || [])[idx];
		res.json({ success: true, printer: outPrinter });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// POST /api/shops/:shopId/printers/:printerId/sync  (forced sync from agent for that shop; returns updated printer)
router.post('/:shopId/printers/:printerId/sync', async (req, res) => {
	try {
		await scheduledSync(req.params.shopId);
	const shop = await NewShop.findOne({ shop_id: req.params.shopId }).lean({ virtuals: true });
		if (!shop) return res.status(404).json({ message: 'Shop not found after sync' });
		const printer = (shop.printers || []).find(p => (p.printerid || p.printerId) === req.params.printerId);
		if (!printer) return res.status(404).json({ message: 'Printer not found after sync' });
		res.json({ ...printer, printerid: printer.printerid || printer.printerId || null });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET /api/shops/:shopId/paper-sizes -> union of sizes from agentDetected across printers (and manualOverride when present)
router.get('/:shopId/paper-sizes', async (req, res) => {
	try {
		const shop = await NewShop.findOne({ shop_id: req.params.shopId });
		if (!shop) return res.status(404).json({ error: 'Shop not found' });
		const sizes = new Set();
		for (const p of (shop.printers || [])) {
			const a = (p.agentDetected?.capabilities?.[0]) || p.agentDetected?.capabilities || {};
			const m = (p.manualOverride?.capabilities?.[0]) || p.manualOverride?.capabilities || {};
			(Array.isArray(a.paperSizes) ? a.paperSizes : []).forEach(s => sizes.add(s));
			(Array.isArray(m.paperSizes) ? m.paperSizes : []).forEach(s => sizes.add(s));
		}
		res.json({ sizes: Array.from(sizes) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});
// PATCH /api/shops/:shopId/printers/:printerId/manualStatus  (shopkeeper toggles printer on/off for allocation)
router.patch('/:shopId/printers/:printerId/manualStatus', async (req, res) => {
	try {
		const { manualStatus } = req.body || {};
		if (!['on','off','pending_off'].includes(manualStatus)) {
			return res.status(400).json({ message: 'Invalid manualStatus. Use on/off/pending_off' });
		}
		const shop = await resolveShopByAny(req.params.shopId);
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const printers = shop.printers || [];
		// flexible matching: find by printerid/printerId or agentDetected.name
		const target = req.params.printerId;
		const decoded = decodeURIComponent(target);
		const sanitize = (v) => (v || '').toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
		const targetSan = sanitize(decoded);
		let printer = null;
		for (const p of printers) {
			const idVal = p.printerid || p.printerId;
			if (!idVal) continue;
			const idSan = sanitize(idVal);
			if (idVal === target || idVal === decoded || idSan === targetSan) { printer = p; break; }
		}
		if (!printer) {
			for (const p of printers) {
				const alt = p.agentDetected?.name;
				if (alt && sanitize(alt) === targetSan) { printer = p; break; }
			}
		}
		if (!printer) return res.status(404).json({ message: 'Printer not found' });

		let nextStatus = manualStatus;
		// If turning off and an active job exists, mark pending_off
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

		// Persist resulting status
		const idx = printers.findIndex(p => p === printer);
		const setObj = {};
		setObj[`printers.${idx}.manualStatus`] = nextStatus;
		const updatedShop = await NewShop.findByIdAndUpdate(shop._id, { $set: setObj }, { new: true }).lean();
		const outPrinter = (updatedShop.printers || [])[idx];
		return res.json({ success: true, printer: outPrinter });
	} catch (err) {
		return res.status(500).json({ message: err.message });
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
			const shopRaw = await resolveShopByAny(req.params.id);
			if (!shopRaw) {
				return res.status(404).json({ message: 'Shop not found' });
			}
			const shop = await NewShop.findByIdAndUpdate(
				shopRaw._id,
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

// PATCH update agent status and installedAt (onboarding agent install)
router.patch('/:id/agent', async (req, res) => {
	try {
			// Accept either Mongo _id or shop code
			const shopRaw = await resolveShopByAny(req.params.id);
			if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });
			const shop = await NewShop.findByIdAndUpdate(
				shopRaw._id,
				{ agent: { status: req.body.status, installedAt: req.body.installedAt } },
				{ new: true, runValidators: true }
			);
			if (!shop) return res.status(404).json({ message: 'Shop not found' });
			res.json(shop);
	} catch (error) {
		res.status(400).json({ message: error.message });
	}
});
// PATCH update only the plan for a shop (onboarding)
router.patch('/:id/plan', async (req, res) => {
	try {
			// Accept either Mongo _id or shop code
			const shopRaw = await resolveShopByAny(req.params.id);
			if (!shopRaw) return res.status(404).json({ message: 'Shop not found' });
			const shop = await NewShop.findByIdAndUpdate(
				shopRaw._id,
				{ plan: req.body.plan },
				{ new: true, runValidators: true }
			);
			if (!shop) return res.status(404).json({ message: 'Shop not found' });
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

// GET /api/shops/:shopId/dailystats  -> return embedded dailystats array (sorted newest first)
router.get('/:shopId/dailystats', async (req, res) => {
	try {
		const shopId = req.params.shopId;
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30')));
	const shop = await NewShop.findOne({ shop_id: shopId }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
	const ds = shop.dailystats || {};
	const entries = Object.entries(ds).map(([date, obj]) => ({ date, totalJobsCompleted: obj?.totalJobsCompleted ?? obj?.completedCount ?? 0, createdAt: obj?.createdAt })).sort((a,b) => b.date.localeCompare(a.date));
	// Include lifetime counter (fast lookup) so frontend can show all-time total without scanning DB
	const lifetime = typeof shop.lifetimeJobsCompleted === 'number' ? shop.lifetimeJobsCompleted : undefined;
	return res.json({ success: true, count: entries.length, data: entries.slice(0, limit), lifetimeJobsCompleted: lifetime });
	} catch (err) {
		console.error('[DAILYSTATS] Error:', err);
		res.status(500).json({ message: err.message });
	}
});


// GET /api/shops/:shopId/total-revenue -> return hierarchical revenue maps; if ?sum=true, also return total sum of all periods
router.get('/:shopId/total-revenue', async (req, res) => {
	try {
		const shopId = req.params.shopId;
	const shop = await NewShop.findOne({ shop_id: shopId }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const tr = shop.totalRevenue || { daily: {}, weekly: {}, monthly: {}, yearly: {} };
					const payload = {
						daily: tr.daily || {},
			weekly: tr.weekly || {},
			monthly: tr.monthly || {},
			yearly: tr.yearly || {}
		};
		if (req.query.sum === 'true') {
			const sumObj = (obj) => Object.values(obj || {}).reduce((s, v) => s + (v?.totalRevenue || 0), 0);
			let total = sumObj(payload.daily) + sumObj(payload.weekly) + sumObj(payload.monthly) + sumObj(payload.yearly);
			// Ensure "till present date": include today's revenue dynamically if today's bucket isn't present yet
			try {
				const today = new Date(); today.setHours(0,0,0,0);
				const todayKey = today.toISOString().slice(0,10);
				const hasToday = payload.daily && Object.prototype.hasOwnProperty.call(payload.daily, todayKey);
				if (!hasToday) {
					const canonical = shop.shop_id || shopId;
					const end = new Date();
					const rows = await FinalJob.aggregate([
						{ $match: { shop_id: canonical, job_status: 'completed', createdAt: { $gte: today, $lt: end } } },
						{ $project: { amount: { $cond: [ { $isNumber: '$total_amount' }, '$total_amount', { $convert: { input: '$total_amount', to: 'double', onError: 0, onNull: 0 } } ] } } },
						{ $group: { _id: null, total: { $sum: '$amount' } } }
					]);
					total += rows[0]?.total || 0;
				}
			} catch(e) { /* ignore dynamic add failure */ }
			payload.total = total;
		}
		res.json(payload);
	} catch (err) {
		console.error('[TOTAL-REVENUE HIER] Error:', err);
		res.status(500).json({ message: err.message });
	}
});

// GET /api/shops/:shopId/revenue -> return arrays for daily/weekly/monthly/yearly
router.get('/:shopId/revenue', async (req, res) => {
	try {
		const shopId = req.params.shopId;
		const shop = await NewShop.findOne({ shop_id: shopId }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const tr = shop.totalRevenue || { daily: {}, weekly: {}, monthly: {}, yearly: {} };
		const mapToArr = (obj) => Object.entries(obj || {}).map(([k, v]) => ({ date: k, totalRevenue: v?.totalRevenue || 0 }));
		const payload = {
			daily: (mapToArr(tr.daily)).sort((a,b) => String(a.date).localeCompare(String(b.date))),
			weekly: (mapToArr(tr.weekly)).sort((a,b) => String(a.date).localeCompare(String(b.date))),
			monthly: (mapToArr(tr.monthly)).sort((a,b) => String(a.date).localeCompare(String(b.date))),
			yearly: (mapToArr(tr.yearly)).sort((a,b) => String(a.date).localeCompare(String(b.date)))
		};
		return res.json(payload);
	} catch (err) {
		console.error('[REVENUE] Error:', err);
		return res.status(500).json({ message: err.message || 'Server error' });
	}
});

// GET /api/shops/total-revenue -> grand total revenue across all shops (sum of all totalrevenue map values)
router.get('/total-revenue', async (req, res) => {
	try {
		const shops = await NewShop.find({}, { totalRevenue: 1 }).lean();
		let grand = 0;
		const sumObj = (obj) => Object.values(obj || {}).reduce((acc, v) => acc + (v?.totalRevenue || 0), 0);
		for (const s of shops) {
			const tr = s.totalRevenue || {};
			grand += sumObj(tr.daily) + sumObj(tr.weekly) + sumObj(tr.monthly) + sumObj(tr.yearly);
		}
		res.json({ totalRevenue: grand });
	} catch (error) {
		console.error('[TOTAL-REVENUE ALL] Error:', error);
		res.status(500).json({ message: 'Server error', error: error.message });
	}
});


// POST /api/shops/:shopId/dailystats/refresh
// Recompute and upsert today's completedCount for a specific shop from FinalJob
router.post('/:shopId/dailystats/refresh', async (req, res) => {
	try {
		const shopId = req.params.shopId;
		const shop = await NewShop.findOne({ shop_id: shopId }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const canonical = shop.shop_id || shop.shopId || shopId;
		const start = new Date(); start.setHours(0,0,0,0);
		const end = new Date(start); end.setDate(end.getDate() + 1);
		const completed = await FinalJob.countDocuments({
			shop_id: canonical,
			job_status: 'completed',
			$or: [
				{ completed_at: { $gte: start, $lt: end } },
				{ createdAt: { $gte: start, $lt: end } }
			]
		});
		const dayStr = start.toISOString().slice(0,10);
		await NewShop.updateOne(
			{ shop_id: canonical },
			{ $set: { [`dailystats.${dayStr}.totalJobsCompleted`]: completed, [`dailystats.${dayStr}.createdAt`]: new Date() } }
		);
		return res.json({ success: true, shop_id: canonical, date: dayStr, totalJobsCompleted: completed });
	} catch (err) {
		console.error('[DAILYSTATS REFRESH] Error:', err);
		res.status(500).json({ message: err.message });
	}
});

// POST /api/admin/dailystats/refresh-all
// Recompute today's completedCount for all shops (admin convenience)
router.post('/admin/dailystats/refresh-all', async (req, res) => {
	try {
		const shops = await NewShop.find({}, { shop_id: 1 }).lean();
		const start = new Date(); start.setHours(0,0,0,0);
		const end = new Date(start); end.setDate(end.getDate() + 1);
		const dayStr = start.toISOString().slice(0,10);
		const results = [];
		for (const s of shops) {
			const sid = s.shop_id;
			if (!sid) continue;
			const completed = await FinalJob.countDocuments({
				shop_id: sid,
				job_status: 'completed',
				$or: [
					{ completed_at: { $gte: start, $lt: end } },
					{ createdAt: { $gte: start, $lt: end } }
				]
			});
			await NewShop.updateOne(
				{ shop_id: sid },
				{ $set: { [`dailystats.${dayStr}.totalJobsCompleted`]: completed, [`dailystats.${dayStr}.createdAt`]: new Date() } }
			);
			results.push({ shop: sid, completed });
		}
		return res.json({ success: true, date: dayStr, results });
	} catch (err) {
		console.error('[DAILYSTATS REFRESH ALL] Error:', err);
		res.status(500).json({ message: err.message });
	}
});

// GET newshop by ID (move to end of file)
// ...existing code...
router.get('/:id', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		// Ensure isOpen is always present in response
		if (typeof shop.isOpen === 'undefined') {
			shop.isOpen = true;
			await shop.save();
		}
		res.json(shop);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

// POST create newshop
router.post('/', async (req, res) => {
	try {
			// Generate a readable, name-derived unique shop_id (e.g. "rambo_print_shop", "rambo_print_shop_1")
			// This keeps the ID human-friendly and related to the shop name while guaranteeing
			// uniqueness by checking the database and falling back to numeric/random suffixes.
			async function generateUniqueShopId(shopName) {
				const normalize = (s) => {
					if (!s) return '';
					// lowercase, replace non-alnum with underscores, collapse underscores, trim
					return String(s)
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '_')
						.replace(/_+/g, '_')
						.replace(/^_+|_+$/g, '');
				};

				let baseId = normalize(shopName || 'shop');
				if (!baseId) baseId = 'shop';

				// Try baseId first
				let candidate = baseId;
				const exists = await NewShop.findOne({ shop_id: candidate }).lean();
				if (!exists) return candidate;

				// Try incremental suffixes _1 .. _99
				for (let i = 1; i <= 99; i++) {
					candidate = `${baseId}_${i}`;
					const e = await NewShop.findOne({ shop_id: candidate }).lean();
					if (!e) return candidate;
				}

				// Try a few random 4-digit suffixes
				for (let tries = 0; tries < 10; tries++) {
					const rand = Math.floor(Math.random() * 9000) + 1000; // 1000..9999
					candidate = `${baseId}_${rand}`;
					const e = await NewShop.findOne({ shop_id: candidate }).lean();
					if (!e) return candidate;
				}

						// Extremely rare: fallback to timestamp suffix (use last 4 digits to keep suffix length <= 4)
						candidate = `${baseId}_${Date.now().toString().slice(-4)}`;
				return candidate;
			}
		// Generate API key
		function generateApiKey() {
			return crypto.randomBytes(16).toString('hex');
		}
		// Hash password
		const hashedPassword = await bcrypt.hash(req.body.password, 10);
		// Prepare base data
		const baseData = {
			...req.body,
			password: hashedPassword
		};
		if (req.body.pricing) baseData.pricing = req.body.pricing;

		// Try to create a shop with a unique shopId derived from the shopName.
		// We attempt a few save retries in case of rare race-condition duplicate-key errors.
		const MAX_SAVE_ATTEMPTS = 6;
		let lastErr = null;
		for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
			const candidateShopId = await generateUniqueShopId(req.body.shopName || req.body.name || req.body.shopName || 'shop');
			const candidateApiKey = generateApiKey();
			const shopData = Object.assign({}, baseData, { shop_id: candidateShopId, apiKey: candidateApiKey });
			const shop = new NewShop(shopData);
			try {
				const savedShop = await shop.save();
				// Generate and persist QR PNG for this shop
				try {
					const { generateShopQRFile } = require('../utils/generateShopQRFile');
					await generateShopQRFile(savedShop.shop_id || candidateShopId);
				} catch (qrErr) {
					console.warn('[SHOP CREATE] QR generation warning:', qrErr.message);
				}

				// Reconcile any pre-existing completed FinalJobs for this shop so counters
				// are populated immediately for newly-registered shops.
				// We only pick FinalJobs with job_status:'completed' and dailyIncrementDone != true
				// Aggregate totals per calendar-day (UTC YYYY-MM-DD) and apply to NewShop
				try {
					const pending = await FinalJob.find({ shop_id: savedShop.shop_id, job_status: 'completed', dailyIncrementDone: { $ne: true } }).lean();
					if (pending && pending.length > 0) {
						const dayMap = Object.create(null);
						let lifetimeJobs = 0;
						let lifetimeRevenue = 0;
						for (const j of pending) {
							const d = new Date(j.completed_at || j.updatedAt || j.createdAt || Date.now());
							const dayKey = d.toISOString().slice(0,10); // UTC day
							const amt = (typeof j.total_amount === 'number') ? j.total_amount : (parseFloat(j.total_amount) || 0);
							if (!dayMap[dayKey]) dayMap[dayKey] = { count: 0, revenue: 0 };
							dayMap[dayKey].count += 1;
							dayMap[dayKey].revenue += amt;
							lifetimeJobs += 1;
							lifetimeRevenue += amt;
						}
						// Build atomic update for NewShop
						const incObj = {};
						const setObj = {};
						for (const [day, vals] of Object.entries(dayMap)) {
							incObj[`dailystats.${day}.totalJobsCompleted`] = vals.count;
							setObj[`dailystats.${day}.createdAt`] = new Date();
							incObj[`totalRevenue.daily.${day}.totalRevenue`] = vals.revenue;
						}
						if (lifetimeJobs) incObj.lifetimeJobsCompleted = lifetimeJobs;
						if (lifetimeRevenue) incObj.lifetimeRevenue = lifetimeRevenue;
						if (Object.keys(incObj).length > 0) {
							await NewShop.updateOne({ _id: savedShop._id }, { $inc: incObj, $set: setObj }).exec();
							// Mark those FinalJobs as applied so future hooks won't double-count
							await FinalJob.updateMany({ shop_id: savedShop.shop_id, job_status: 'completed', dailyIncrementDone: { $ne: true } }, { $set: { dailyIncrementDone: true } }).exec();
							console.log('[SHOP CREATE] Reconciled', pending.length, 'FinalJobs for shop', savedShop.shop_id);
						}
					}
				} catch (reconErr) {
					console.warn('[SHOP CREATE] Reconciliation failed (non-fatal):', reconErr && reconErr.message ? reconErr.message : reconErr);
				}

				return res.status(201).json(savedShop);
			} catch (err) {
				// If duplicate key error on save, retry with a freshly generated candidate
				if (err && err.code === 11000) {
					lastErr = err;
					continue; // try again
				}
				throw err;
			}
		}
	console.error('[SHOP CREATE] Failed to generate unique shopId after attempts', lastErr);
	return res.status(500).json({ message: 'Failed to generate unique shopId', error: lastErr?.message || null });
	} catch (error) {
		res.status(400).json({ message: error.message || 'Registration failed' });
	}
});

// GET /api/shops/:shop_id/qr - fetch QR URL and direct link
router.get('/:shop_id/qr', async (req, res) => {
	try {
		const id = req.params.shop_id;
		const shop = await NewShop.findOne({ shop_id: id });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		// If QR not yet generated, attempt generation now (best-effort)
		let qrUrl = shop.qr_code_url;
		if (!qrUrl) {
			try {
				const { generateShopQRFile } = require('../utils/generateShopQRFile');
				qrUrl = await generateShopQRFile(shop.shop_id || id);
			} catch (e) {
				// ignore and just return without qr
			}
		}
		res.json({
			success: true,
			qr_code_url: qrUrl || null,
			link: `https://www.eazeprint.com/app?shop=${encodeURIComponent(shop.shop_id || id)}`
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
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

// GET current open/close status for a shop
router.get('/status/:shopId', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.shopId);
		if (!shop) return res.status(404).json({ error: 'Shop not found' });
		return res.json({ isOpen: !!shop.isOpen });
	} catch (err) {
		console.error('[SHOP STATUS] Error:', err);
		return res.status(500).json({ error: 'Server error' });
	}
});

// PATCH toggle open/close status for a shop
router.patch('/toggle-status/:shopId', async (req, res) => {
	try {
		const { isOpen } = req.body || {};
		if (typeof isOpen !== 'boolean') return res.status(400).json({ error: 'isOpen boolean is required' });
		// Resolve shop by code or id
		const shop = await resolveShopByAny(req.params.shopId);
		if (!shop) return res.status(404).json({ error: 'Shop not found' });
		const updated = await NewShop.findByIdAndUpdate(shop._id, { $set: { isOpen } }, { new: true }).lean();
		return res.json({ success: true, isOpen: !!(updated && updated.isOpen) });
	} catch (err) {
		console.error('[TOGGLE STATUS] Error:', err);
		return res.status(500).json({ error: 'Failed to update shop status' });
	}
});

// Catch-all error handler for this router
router.use((err, req, res, next) => {
	res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = router;
/** DASHBOARD ROUTES BELOW **/
