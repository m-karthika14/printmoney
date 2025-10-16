const mongoose = require('mongoose');

const DailyShopStatsSchema = new mongoose.Schema({
  shop_id: { type: String, required: true },
  // Local date string like YYYY-MM-DD
  date: { type: String, required: true },
  completedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

DailyShopStatsSchema.index({ shop_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyShopStats', DailyShopStatsSchema);
