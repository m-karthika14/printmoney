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
  'totalpages',
  'totalpagesprinted',
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
  return { ...rest };
}

module.exports = { buildFinalFromJob };
