// Unified helpers for calendar-day buckets in UTC.
// (Formerly IST; all logic migrated to UTC storage. Frontend handles display conversions.)

function getIstDayKey(d = new Date()) { // retained name for backward compatibility
  // Return YYYY-MM-DD based on UTC date (slice of ISO string)
  return new Date(d).toISOString().slice(0, 10);
}

function getIstDayRangeFor(d = new Date()) { // retained name for backward compatibility
  const key = getIstDayKey(d);
  const [y, m, day] = key.split('-').map(Number);
  const startUtcMs = Date.UTC(y, m - 1, day); // UTC midnight
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000; // +1 day
  return { dayStr: key, start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

// New explicit UTC aliases (optional future refactor)
const getUtcDayKey = getIstDayKey;
const getUtcDayRangeFor = getIstDayRangeFor;

module.exports = { getIstDayKey, getIstDayRangeFor, getUtcDayKey, getUtcDayRangeFor };
