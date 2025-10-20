const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

dotenv.config();
const app = express();


// Middleware: CORS with env-configurable allowed origins (comma-separated), supports wildcard like *.onrender.com
const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) allowedOrigins.push(...defaultOrigins);

function originAllowed(origin) {
  if (!origin) return true;
  // In development, allow any localhost/127.0.0.1 origin (any port)
  try {
    const u = new URL(origin);
    const isLocal = (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (isLocal && process.env.NODE_ENV !== 'production') return true;
  } catch {}
  for (const pattern of allowedOrigins) {
    if (pattern === '*') return true;
    if (pattern === origin) return true;
    // wildcard subdomain support: *.domain.com
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1); // remove leading *
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

app.use(cors({
  origin: function(origin, callback) {
    if (originAllowed(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for uploaded files)
const uploadsDir = path.join(__dirname, 'uploads');
try {
  const qrcodesDir = path.join(uploadsDir, 'qrcodes');
  if (!require('fs').existsSync(qrcodesDir)) {
    require('fs').mkdirSync(qrcodesDir, { recursive: true });
  }
} catch {}
app.use('/uploads', express.static(uploadsDir));


const shopPrintersRoutes = require('./routes/shopPrinters');
const shopRoutes = require('./routes/shop');
const newShopRoutes = require('./routes/newshop');
const finalJobRoutes = require('./routes/finaljob');
const jobsRoutes = require('./routes/jobs');
app.use('/api/shop-printers', shopPrintersRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/newshop', newShopRoutes);
app.use('/api/finaljobs', finalJobRoutes);
app.use('/api/jobs', jobsRoutes);

// Printer sync: scheduler + admin endpoint
const { syncPrinters, scheduledSync } = require('./utils/printerSync');
app.post('/api/admin/sync-printers', async (req, res) => {
  try {
    const { shop_id, shopId } = req.body || {};
    const result = await scheduledSync(shop_id || shopId);
    res.json({ success: true, ...(result || {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Back-compat: trigger sync for a specific shop via path param
app.post('/api/sync/printers/:shopId', async (req, res) => {
  try {
    const result = await scheduledSync(req.params.shopId);
    res.json({ success: true, ...(result || {}) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: force job allocation (optionally for a specific shop)
const allocateJobs = require('./jobPoller');
app.post('/api/admin/allocate-jobs', async (req, res) => {
  try {
    const { shop_id, shopId } = req.body || {};
    await allocateJobs(shop_id || shopId);
    res.json({ success: true, message: 'Allocation run completed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PrintMoney Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

console.log('MONGO_URI:', process.env.MONGO_URI);
// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  // Start printer sync scheduler (every 20 seconds, reentrant-safe)
  setInterval(() => {
    scheduledSync().catch(err => console.error('[PRINTER-SYNC] Interval error:', err));
  }, 20000);
  // Start job poller for finalJobs assignment (every 15 seconds)
  require('./jobPoller');

  // Start server only after DB is connected
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
  // Socket.IO removed: polling is used on frontend

  // Indices for performance (idempotent)
  try {
    const FinalJob = require('./models/FinalJob');
    FinalJob.collection.createIndex({ shop_id: 1, job_status: 1, createdAt: 1 }).catch(()=>{});
    // TTL: 24 hours on createdAt
    FinalJob.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }).catch(()=>{});
  const NewShop = require('./models/NewShop');
  NewShop.collection.createIndex({ shopId: 1 }).catch(()=>{});
  } catch (e) {
    console.warn('Index setup warning:', e.message);
  }

  // Daily cron at 00:05 local time to snapshot previous day completed counts per shop
  try {
    const FinalJob = require('./models/FinalJob');
    const NewShop = require('./models/NewShop');
    // Cron: write previous day's completedCount into each shop's embedded dailystats array
    cron.schedule('5 0 * * *', async () => {
      try {
        const shops = await NewShop.find({}, { shop_id: 1, shopId: 1 }).lean();
        const prev = new Date();
        prev.setDate(prev.getDate() - 1);
        prev.setHours(0,0,0,0);
        const dayStr = prev.toISOString().slice(0,10);
        for (const s of shops) {
          const sid = s.shop_id || s.shopId;
          if (!sid) continue;
          const start = new Date(prev);
          const end = new Date(prev); end.setDate(end.getDate() + 1);
          // Count completed FinalJobs for the calendar day: prefer completed_at, fallback to createdAt
          const completed = await FinalJob.countDocuments({
            shop_id: sid,
            job_status: 'completed',
            $or: [
              { completed_at: { $gte: start, $lt: end } },
              { createdAt: { $gte: start, $lt: end } }
            ]
          });
          // Write to map-style dailystats
          await NewShop.updateOne(
            { shop_id: sid },
            { $set: { [`dailystats.${dayStr}.totalJobsCompleted`]: completed, [`dailystats.${dayStr}.createdAt`]: new Date() } }
          );
        }
          // Aggregation cron at 00:20 to roll daily -> weekly -> monthly -> yearly
          cron.schedule('20 0 * * *', async () => {
            try {
              const { aggregateRevenue } = require('./scripts/aggregateRevenue');
              await aggregateRevenue();
              console.log('[CRON][aggregateRevenue] completed');
            } catch (e) {
              console.error('[CRON][aggregateRevenue] error:', e.message);
            }
          });
        console.log(`[CRON] Embedded dailystats updated for ${shops.length} shops on ${dayStr}`);
      } catch (err) {
        console.error('[CRON] Daily snapshot failed:', err.message);
      }
    });

      // At 00:10 every day, compute and store previous day's totalRevenue per shop
      cron.schedule('10 0 * * *', async () => {
        try {
          const shops = await NewShop.find({}, { shop_id: 1, shopId: 1 }).lean();
          const end = new Date(); end.setHours(0,0,0,0); // today 00:00
          const start = new Date(end); start.setDate(start.getDate() - 1); // yesterday 00:00
          const dayStr = start.toISOString().slice(0,10);
          for (const s of shops) {
            const sid = s.shop_id || s.shopId; if (!sid) continue;
            const rows = await FinalJob.aggregate([
              { $match: { shop_id: sid, job_status: 'completed', createdAt: { $gte: start, $lt: end } } },
              { $project: { amount: { $cond: [ { $isNumber: '$total_amount' }, '$total_amount', { $convert: { input: '$total_amount', to: 'double', onError: 0, onNull: 0 } } ] } } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const total = rows[0]?.total || 0;
             await NewShop.updateOne(
               { shop_id: sid },
               { $set: { [`totalRevenue.daily.${dayStr}.totalRevenue`]: total, [`totalRevenue.daily.${dayStr}.createdAt`]: new Date() } }
             );
          }
          console.log('[CRON][totalrevenue] snapshot done for', dayStr);
        } catch (e) {
          console.error('[CRON][totalrevenue] error:', e);
        }
      });
  } catch (e) {
    console.warn('Cron setup warning:', e.message);
  }
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});