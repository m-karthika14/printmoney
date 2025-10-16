const express = require('express');
const router = express.Router();
const NewShop = require('../models/NewShop');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { scheduledSync } = require('../utils/printerSync');
const FinalJob = require('../models/FinalJob');
const DailyShopStats = require('../models/DailyShopStats');
// GET shop by canonical shop_id (new) and keep legacy (shopId) for compatibility
router.get('/by-shop/:shop_id', async (req, res) => {
	try {
		const shop = await NewShop.findOne({ $or: [{ shop_id: req.params.shop_id }, { shopId: req.params.shop_id }] });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const obj = shop.toObject();
		delete obj.password;
		res.json(obj);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

router.get('/by-shopId/:shopId', async (req, res) => {
	try {
		const shop = await NewShop.findOne({ $or: [{ shop_id: req.params.shopId }, { shopId: req.params.shopId }] });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const obj = shop.toObject();
		delete obj.password;
		res.json(obj);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Helper: resolve by id (ObjectId) or shop_id/shopId string
async function resolveShopByAny(idOrCode) {
  if (!idOrCode) return null;
  const isHex24 = /^[a-fA-F0-9]{24}$/.test(idOrCode);
  if (isHex24) return await NewShop.findById(idOrCode);
  return await NewShop.findOne({ $or: [{ shop_id: idOrCode }, { shopId: idOrCode }] });
}

// GET paperSizePricing for a shop (accepts Mongo _id or shop_id)
router.get('/shop/:id/paper-size-pricing', async (req, res) => {
	try {
		const shop = await resolveShopByAny(req.params.id);
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found' });
		}
		res.status(200).json({ paperSizePricing: shop.pricing.paperSizePricing });
	} catch (error) {
		console.error('Error fetching paperSizePricing:', error);
		res.status(500).json({ message: 'Server error while fetching paperSizePricing' });
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
		const shop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
			{ $set: { 'pricing.paperSizePricing': paperSizePricing } },
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
		const shop = await NewShop.findOne({ $or: [{ shop_id: shopId }, { shopId }] }).lean();
		if (!shop) return res.status(404).json({ message: 'Shop not found' });

		const canonical = shop.shop_id || shop.shopId || shopId;

		// Time boundaries (local start of today and yesterday)
		const now = new Date();
		const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
		const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
		const endOfYesterday = new Date(startOfToday); endOfYesterday.setMilliseconds(-1);

		// Counts
			const [completedToday, pendingNow] = await Promise.all([
				FinalJob.countDocuments({
					shop_id: canonical,
					job_status: 'completed',
					$or: [
						{ completed_at: { $gte: startOfToday } },
						{ createdAt: { $gte: startOfToday } } // fallback if completed_at missing
					]
				}),
				FinalJob.countDocuments({ shop_id: canonical, job_status: 'pending' })
			]);

		// Yesterday from snapshot first, else fallback to direct query
		let yesterdayCompleted = 0;
			const yDoc = await DailyShopStats.findOne({ shop_id: canonical, date: startOfYesterday.toISOString().slice(0,10) }).lean();
		if (yDoc) {
			yesterdayCompleted = yDoc.completedCount || 0;
		} else {
				// Fallback (may be partially purged by TTL depending on time)
				yesterdayCompleted = await FinalJob.countDocuments({
					shop_id: canonical,
					job_status: 'completed',
					$or: [
						{ completed_at: { $gte: startOfYesterday, $lte: endOfYesterday } },
						{ createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } }
					]
				});
		}
		const changePercent = (() => {
			if (!yesterdayCompleted) return '+0%';
			const diff = completedToday - yesterdayCompleted;
			const pct = Math.round((diff / Math.max(1, yesterdayCompleted)) * 100);
			const sign = pct >= 0 ? '+' : '';
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

		// Prefer NewShop.dailystats if present per user ask
		const ds = shop.dailystats || {};
		const hasDsTotal = typeof ds.totaljobscompleeted === 'number' && !Number.isNaN(ds.totaljobscompleeted);
		const hasDsChange = typeof ds.jobpercentchaneg === 'string' && ds.jobpercentchaneg !== '';
		// Prefer computed when it's non-zero; else fallback to dailystats if provided
		const useComputed = completedToday > 0 || !hasDsTotal;
		const finalTotal = useComputed ? completedToday : ds.totaljobscompleeted;
		const finalChange = useComputed ? changePercent : (hasDsChange ? ds.jobpercentchaneg : changePercent);

		// Final payload
		res.json({
			shopName: shop.shopName,
			isOpen: typeof shop.isOpen === 'boolean' ? shop.isOpen : true,
			earningsToday: 0, // dummy allowed
			printJobsToday: { totalCompleted: finalTotal, changePercent: finalChange },
			pendingJobs: pendingNow,
			printers: { online: onlinePrinters, total: totalPrinters },
			recentJobs,
			printerList
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
			{ $or: [{ shop_id: shopId }, { shopId }] },
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
        const { bwSingle, colorSingle, bwDouble, colorDouble } = req.body;
        if (!bwSingle || !colorSingle || !bwDouble || !colorDouble) {
            return res.status(400).json({ message: 'Incomplete pricing data' });
        }

		const shopRaw = await resolveShopByAny(req.params.id);
		if (!shopRaw) {
			return res.status(404).json({ message: 'Shop not found' });
		}

		const updatedShop = await NewShop.findByIdAndUpdate(
			shopRaw._id,
            { $set: { 'pricing.bwSingle': bwSingle, 'pricing.colorSingle': colorSingle, 'pricing.bwDouble': bwDouble, 'pricing.colorDouble': colorDouble } },
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
        
        // First check if shop exists
        const shop = await NewShop.findById(req.params.id);
        if (!shop) {
            console.error('[BACKEND] Shop not found with ID:', req.params.id);
            return res.status(404).json({ message: 'Shop not found' });
        }
        
        console.log('[BACKEND] Found shop:', shop.shopName || shop.email);
        console.log('[BACKEND] Current services count:', shop.services?.length || 0);
        
        // Update services
        const updatedShop = await NewShop.findByIdAndUpdate(
            req.params.id,
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

// --- Printers API (by shopId string) ---

// GET /api/shops/:shopId/printers
router.get('/:shopId/printers', async (req, res) => {
	try {
		const shop = await NewShop.findOne({ $or: [{ shop_id: req.params.shopId }, { shopId: req.params.shopId }] }).lean({ virtuals: true });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const printers = (shop.printers || []).map(p => ({
			...p,
			printerid: p.printerid || p.printerId || null,
			manualStatus: p.manualStatus || 'on'
		}));
		res.json(printers);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// PATCH /api/shops/:shopId/printers/:printerId  (update manualOverride only; partial merge)
router.patch('/:shopId/printers/:printerId', async (req, res) => {
	try {
		const { manualOverride } = req.body || {};
		const shop = await NewShop.findOne({ $or: [{ shop_id: req.params.shopId }, { shopId: req.params.shopId }] });
		if (!shop) return res.status(404).json({ message: 'Shop not found' });
		const idx = (shop.printers || []).findIndex(p => (p.printerid || p.printerId) === req.params.printerId);
		if (idx === -1) return res.status(404).json({ message: 'Printer not found' });

		const existing = shop.printers[idx];
		const incoming = manualOverride || {};
		const merged = {
			name: typeof incoming.name !== 'undefined' ? incoming.name : existing.manualOverride?.name,
			notes: typeof incoming.notes !== 'undefined' ? incoming.notes : existing.manualOverride?.notes,
			capabilities: Array.isArray(incoming.capabilities) && incoming.capabilities.length > 0
				? incoming.capabilities
				: (existing.manualOverride?.capabilities || existing.agentDetected?.capabilities || [])
		};
		existing.manualOverride = merged;
		// ensure printerid field is set for legacy docs
		if (!existing.printerid && existing.printerId) existing.printerid = existing.printerId;
		await shop.save();
		res.json(existing);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// POST /api/shops/:shopId/printers/:printerId/sync  (forced sync from agent for that shop; returns updated printer)
router.post('/:shopId/printers/:printerId/sync', async (req, res) => {
	try {
		await scheduledSync(req.params.shopId);
		const shop = await NewShop.findOne({ $or: [{ shop_id: req.params.shopId }, { shopId: req.params.shopId }] }).lean({ virtuals: true });
		if (!shop) return res.status(404).json({ message: 'Shop not found after sync' });
		const printer = (shop.printers || []).find(p => (p.printerid || p.printerId) === req.params.printerId);
		if (!printer) return res.status(404).json({ message: 'Printer not found after sync' });
		res.json({ ...printer, printerid: printer.printerid || printer.printerId || null });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// PATCH /api/shops/:shopId/printers/:printerId/manualStatus  (shopkeeper toggles printer on/off for allocation)
router.patch('/:shopId/printers/:printerId/manualStatus', async (req, res) => {
	try {
		const { manualStatus } = req.body || {};
		if (!['on','off','pending_off'].includes(manualStatus)) {
			return res.status(400).json({ message: 'Invalid manualStatus. Use on/off/pending_off' });
		}
		const { shopId, printerId } = req.params;
		const shop = await NewShop.findOne({ $or: [{ shop_id: shopId }, { shopId }] });
		if (!shop) {
			return res.status(404).json({ message: 'Shop not found', code: 'SHOP_NOT_FOUND', shopId });
		}
		const targetId = printerId;
		const printers = shop.printers || [];
		// Flexible matching (exact, decoded, with space/underscore swaps)
		const decoded = decodeURIComponent(targetId);
		const variants = new Set([
			targetId,
			decoded,
			decoded.replace(/_/g, ' '),
			decoded.replace(/ /g, '_')
		]);

		const sanitize = (v) => (v || '')
			.toString()
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_')
			.replace(/-+/g, '_');
		const targetSan = sanitize(decoded);

		let printer = null;
		for (const p of printers) {
			const idVal = p.printerid || p.printerId;
			if (!idVal) continue;
			const idSan = sanitize(idVal);
			if (variants.has(idVal) || variants.has(idSan) || idSan === targetSan) { printer = p; break; }
			// allow startsWith match if still not found (sometimes agent adds port suffix) only if unique
			if (!printer && idSan.startsWith(targetSan)) {
				printer = p;
			}
		}
		if (!printer) {
				// second pass: try matching by agentDetected.name
				for (const p of printers) {
					const alt = p.agentDetected?.name;
					if (alt && sanitize(alt) === targetSan) { printer = p; break; }
				}
			}
			if (!printer) {
			return res.status(404).json({
				message: 'Printer not found',
				code: 'PRINTER_NOT_FOUND',
				requested: targetId,
				requestedNormalized: targetSan,
				available: printers.map(p => ({ raw: p.printerid || p.printerId, norm: sanitize(p.printerid || p.printerId) }))
			});
		}
				// If turning off and an active job exists, mark pending_off
			let nextStatus = manualStatus;
			if (manualStatus === 'off') {
				const pid = printer.printerid || printer.printerId;
					const pname = printer.agentDetected?.name;
				const activeJob = await FinalJob.findOne({
					shop_id: shopId,
					$or: [
							{ printerid: pid },
							{ assigned_printer: pid },
							...(pname ? [{ assigned_printer: pname }] : [])
					],
						job_status: { $in: ['pending', 'printing', 'alloted', 'processing'] }
				}).lean();
				if (activeJob) nextStatus = 'pending_off';
			}
			printer.manualStatus = nextStatus;
		await shop.save();
			res.json({ success: true, printer });
	} catch (err) {
		res.status(500).json({ message: err.message });
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
		// Ensure pricing field is included if provided
		const shopData = {
			...req.body,
			password: hashedPassword,
			shopId: generateShopId(),
			apiKey: generateApiKey()
		};
		if (req.body.pricing) {
			shopData.pricing = req.body.pricing;
		}
		const shop = new NewShop(shopData);
		const savedShop = await shop.save();
		res.status(201).json(savedShop);
	} catch (error) {
		res.status(400).json({ message: error.message || 'Registration failed' });
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

// Catch-all error handler for this router
router.use((err, req, res, next) => {
	res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = router;
/** DASHBOARD ROUTES BELOW **/

