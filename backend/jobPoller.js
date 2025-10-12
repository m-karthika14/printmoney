const Job = require('./models/Job');
const FinalJob = require('./models/FinalJob');
const NewShop = require('./models/NewShop');

async function pollJobsAndAssignPrinters() {
  console.log('[JobPoller] Polling jobs collection for pending jobs...');
  const pendingJobs = await Job.find({ job_status: 'pending' });
  console.log(`[JobPoller] Found ${pendingJobs.length} pending jobs.`);
  for (const job of pendingJobs) {
    // Check if job already assigned in finalJobs (by job_number)
    const alreadyAssigned = await FinalJob.findOne({ job_number: job.job_number });
    if (alreadyAssigned) {
      console.log(`[JobPoller] Job ${job.job_number} already assigned, skipping.`);
      continue;
    }

    const shop = await NewShop.findOne({ shopId: job.shop_id });
    if (!shop || !shop.printers || shop.printers.length === 0) {
      console.log(`[JobPoller] No shop or printers found for job ${job.job_number}, skipping.`);
      continue;
    }

    // Find an available printer (customize as needed)
    const availablePrinter = shop.printers.find(p => p.status === 'online');
    if (!availablePrinter) {
      console.log(`[JobPoller] No available printer for job ${job.job_number}, skipping.`);
      continue;
    }

    // Allot job: create finalJob with every field from Job
    const finalJobData = {
      job_number: job.job_number,
      customer: job.customer,
      shop: job.shop,
      shop_id: job.shop_id,
      document_urls: job.document_urls,
      print_options: job.print_options,
      total_amount: job.total_amount,
      payment_status: job.payment_status,
      job_status: 'alloted',
      collection_pin: job.collection_pin,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      queued_at: job.queued_at,
      status: job.status,
      files_processed: job.files_processed,
      pages_printed: job.pages_printed,
      agent_id: job.agent_id,
      processing_started_at: job.processing_started_at,
      assigned_printer: availablePrinter.printerId || availablePrinter.agentDetected?.name,
      printer_assigned_at: new Date(),
      current_file: job.current_file,
      printing_started_at: job.printing_started_at,
      completed_at: job.completed_at,
      printed_by: availablePrinter.printerId || availablePrinter.agentDetected?.name,
      processing_time_seconds: job.processing_started_at && job.completed_at ? Math.round((job.completed_at - job.processing_started_at) / 1000) : undefined,
      queue_confirmed: true,
      manualTriggered: false,
      autoPrintMode: !!shop.autoPrintMode
    };
    const finalJob = new FinalJob(finalJobData);
    await finalJob.save();
    console.log(`[JobPoller] Allotted job ${job.job_number} to printer ${finalJob.assigned_printer} and created finalJob ${finalJob._id}.`);

    // Update original job status and assigned_printer
    job.job_status = 'assigned';
    job.assigned_printer = finalJob.assigned_printer;
    job.printer_assigned_at = finalJob.printer_assigned_at;
    job.updatedAt = new Date();
    await job.save();
    console.log(`[JobPoller] Updated job ${job.job_number} status to assigned and synced printer info.`);
  }
}

setInterval(pollJobsAndAssignPrinters, 15000);
module.exports = pollJobsAndAssignPrinters;
