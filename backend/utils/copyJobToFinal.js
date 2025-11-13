// Build a FinalJob upsert document from a Job document (future-proof dynamic copy)
// - Copies all enumerable own properties from Job
// - Drops _id and __v
// - Preserves date fields and options
// - FinalJob-specific fields should be merged by caller after this

// Fields we intentionally preserve if already set on FinalJob (do not overwrite from Job unless undefined there)
const PRESERVE_IF_FINAL_EXISTS = new Set([
  'printer_status',
  'autoPrintMode',
  'manualTriggered',
  'printer_config',
  // legacy fields removed: use snake_case total_pages / total_printed_pages only
  'total_pages',
  'total_printed_pages',
  'printerid'
]);

function toPlain(obj) {
  if (!obj) return {};
  if (typeof obj.toObject === 'function') return obj.toObject({ depopulate: true, getters: false, virtuals: false });
  try { return JSON.parse(JSON.stringify(obj)); } catch { return { ...obj }; }
}

function buildFinalFromJob(jobDoc, existingFinal) {
  const src = toPlain(jobDoc);
  const { _id, __v, ...rest } = src;
  // If final exists, don't overwrite preserved fields; otherwise keep Job's value
  if (existingFinal) {
    for (const k of Object.keys(rest)) {
      if (PRESERVE_IF_FINAL_EXISTS.has(k) && typeof existingFinal[k] !== 'undefined') {
        // Keep FinalJob value
        rest[k] = existingFinal[k];
      }
    }
  }
  // Normalize page count fields: map legacy camelCase -> snake_case when present on Job,
  // but do NOT write legacy camelCase fields into FinalJob (we keep only snake_case going forward).
  if (typeof rest.total_pages === 'undefined' && typeof rest.totalpages !== 'undefined') {
    rest.total_pages = rest.totalpages;
  }
  if (typeof rest.total_printed_pages === 'undefined' && typeof rest.totalpagesprinted !== 'undefined') {
    rest.total_printed_pages = rest.totalpagesprinted;
  }
  // Remove legacy camelCase keys so FinalJob won't receive them
  delete rest.totalpages;
  delete rest.totalpagesprinted;
  // If watermark contains per-document settings, expose them on both common field names
  // used across the codebase so FinalJob consumers can read whichever name they expect.
  try {
    if (rest.watermark && Array.isArray(rest.watermark.perDocument) && (!rest.perDocOptions || rest.perDocOptions.length === 0)) {
      rest.perDocOptions = rest.watermark.perDocument;
    }
    if (rest.watermark && Array.isArray(rest.watermark.perDocument) && (!rest.perDocumentWatermarks || rest.perDocumentWatermarks.length === 0)) {
      rest.perDocumentWatermarks = rest.watermark.perDocument;
    }
    // Also, if Job used top-level perDocument/perDocumentWatermarks/perDocOptions fields, prefer them
    if (typeof rest.perDocument !== 'undefined' && (!rest.perDocOptions || rest.perDocOptions.length === 0)) {
      rest.perDocOptions = rest.perDocument;
    }
  } catch (e) {
    // be resilient to malformed watermark shapes
  }
  return { ...rest };
}

module.exports = { buildFinalFromJob };
