const mongoose = require('mongoose');

const FinalJobSchema = new mongoose.Schema({
  job_number: { type: String, required: true },
  customer: { type: String },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'newshops' },
  shop_id: { type: String },
  document_urls: [{ type: String }],
  print_options: { type: Object, default: {} },
  total_amount: { type: Number },
  payment_status: { type: String },
  job_status: {
    type: String,
    enum: ['pending', 'alloted', 'processing', 'printing', 'ready'],
    default: 'pending'
  },
  collection_pin: { type: String },
  queued_at: { type: Date },
  processing_started_at: { type: Date },
  printing_started_at: { type: Date },
  completed_at: { type: Date },
  printer_assigned_at: { type: Date },
  assigned_printer: { type: String },
  agent_id: { type: String },
  status: { type: String },
  files_processed: { type: Number },
  pages_printed: { type: Number },
  current_file: { type: String },
  printed_by: { type: String },
  processing_time_seconds: { type: Number },
  queue_confirmed: { type: Boolean },
  manualTriggered: { type: Boolean, default: false },
  autoPrintMode: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updated_at on every save
FinalJobSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('FinalJob', FinalJobSchema);
