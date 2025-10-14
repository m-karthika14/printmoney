const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();


// Middleware
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
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
app.use('/api/shop-printers', shopPrintersRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/newshop', newShopRoutes);
app.use('/api/finaljobs', finalJobRoutes);

// Printer sync: scheduler + admin endpoint
const { syncPrinters, scheduledSync } = require('./utils/printerSync');
app.post('/api/admin/sync-printers', async (req, res) => {
  try {
    const { shopId } = req.body || {};
    const result = await scheduledSync(shopId);
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
    const { shopId } = req.body || {};
    await allocateJobs(shopId);
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
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});
