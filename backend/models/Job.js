const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    customer: { type: String, required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "newshops" },
    shop_id: { type: String, required: true },
    document_urls: [{ type: String }],
    print_options: { type: Object, default: {} },
    total_amount: { type: Number },
    payment_status: { type: String, default: "pending" },
    // Printer allocation pipeline status (pending -> alloted)
    printer_status: { type: String, default: 'pending' },
  job_status: { type: String, default: 'pending' },
    job_number: { type: String },
    collection_pin: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    queued_at: { type: Date },
    status: { type: String },
    files_processed: { type: Number },
    pages_printed: { type: Number },
    agent_id: { type: String },
    processing_started_at: { type: Date },
    assigned_printer: { type: String },
    printer_assigned_at: { type: Date },
    current_file: { type: String },
    printing_started_at: { type: Date },
    completed_at: { type: Date },
    printed_by: { type: String },
    processing_time_seconds: { type: Number },
    queue_confirmed: { type: Boolean },
  },
  { timestamps: true }
);

// Helpful indexes for common queries
JobSchema.index({ shop_id: 1 });
JobSchema.index({ job_number: 1 });

module.exports = mongoose.model("Job", JobSchema, "jobs");

// Sync job updates to FinalJob after allotment
JobSchema.post('save', async function(doc) {
  // Accept both 'alloted' and 'assigned' as meaning the job was claimed/allocated
  if ((doc.job_status === 'alloted' || doc.job_status === 'assigned') && doc.job_number) {
    try {
      const FinalJob = require('./FinalJob');
      await FinalJob.findOneAndUpdate(
        { job_number: doc.job_number },
        {
          customer: doc.customer,
          shop: doc.shop,
          shop_id: doc.shop_id,
          document_urls: doc.document_urls,
          print_options: doc.print_options,
          total_amount: doc.total_amount,
          payment_status: doc.payment_status,
          job_status: doc.job_status,
          collection_pin: doc.collection_pin,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          queued_at: doc.queued_at,
          status: doc.status,
          files_processed: doc.files_processed,
          pages_printed: doc.pages_printed,
          agent_id: doc.agent_id,
          processing_started_at: doc.processing_started_at,
          assigned_printer: doc.assigned_printer,
          printer_assigned_at: doc.printer_assigned_at,
          current_file: doc.current_file,
          printing_started_at: doc.printing_started_at,
          completed_at: doc.completed_at,
          printed_by: doc.printed_by,
          processing_time_seconds: doc.processing_time_seconds,
          queue_confirmed: doc.queue_confirmed
        },
        { new: true }
      );
    } catch (e) {
      console.error('[Job model hook] sync to FinalJob failed:', e.message);
    }
  }
});

module.exports = mongoose.model("Job", JobSchema, "jobs");
