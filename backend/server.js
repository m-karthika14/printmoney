const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

dotenv.config();
const app = express();


// Middleware: CORS with env-configurable allowed origins (comma-separated), supports wildcard like *.onrender.com
const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) allowedOrigins.push(...defaultOrigins);

function originAllowed(origin) {
  if (!origin) return true;
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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
    const DailyShopStats = require('./models/DailyShopStats');
    DailyShopStats.collection.createIndex({ shop_id: 1, date: 1 }, { unique: true }).catch(()=>{});
  } catch (e) {
    console.warn('Index setup warning:', e.message);
  }

  // Daily cron at 00:05 local time to snapshot previous day completed counts per shop
  try {
    const DailyShopStats = require('./models/DailyShopStats');
    const FinalJob = require('./models/FinalJob');
    const NewShop = require('./models/NewShop');
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
          const completed = await FinalJob.countDocuments({ shop_id: sid, job_status: 'completed', createdAt: { $gte: start, $lt: end } });
          await DailyShopStats.updateOne(
            { shop_id: sid, date: dayStr },
            { $set: { completedCount: completed, createdAt: new Date() } },
            { upsert: true }
          );
        }
        console.log(`[CRON] DailyShopStats updated for ${shops.length} shops on ${dayStr}`);
      } catch (err) {
        console.error('[CRON] Daily snapshot failed:', err.message);
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
