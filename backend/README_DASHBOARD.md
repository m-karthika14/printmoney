Dashboard API, realtime and maintenance

Endpoints
- GET /api/shops/shop/:shop_id/dashboard
  Returns a snapshot for the shop dashboard filtered by shop_id (canonical string), including:
  { shopName, isOpen, earningsToday, printJobsToday: { totalCompleted, changePercent }, pendingJobs, printers: { online, total }, recentJobs[], printerList[] }

- PATCH /api/shops/:shop_id/isopen
  Body: { isOpen: boolean } — toggles shop open/closed and emits dashboard.updated

Realtime
- Socket.IO namespace: default; join room shop:{shop_id}
  Events emitted:
  - dashboard.updated: partial snapshot updates (isOpen)
  - job.updated: finaljobs document updated

Cron and retention
- Daily snapshot at 00:05 local time records previous day completed counts in collection dailyshopstats
- FinalJob documents are retained permanently by default. A previous deployment created a TTL index that expired
  `finaljobs.createdAt` after 24 hours; that index is no longer created by the server and existing TTL indexes
  will be dropped on startup so history is preserved.

- Indexes
- finaljobs: { shop_id: 1, job_status: 1, createdAt: 1 } (no TTL)
- newshops: { shop_id: 1 }
- dailyshopstats: { shop_id: 1, date: 1 } unique
- newshops: { shop_id: 1 }
- dailyshopstats: { shop_id: 1, date: 1 } unique

Notes
- No schema changes to finaljobs or jobs.
- newshops model includes a lightweight dailystats object (totaljobscompleeted, jobpercentchaneg) that, when present, is preferred to compute Print Jobs Today card.
