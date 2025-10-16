Dashboard API, realtime and maintenance

Endpoints
- GET /api/shops/shop/:shopId/dashboard
  Returns a snapshot for the shop dashboard filtered by shopId (canonical string), including:
  { shopName, isOpen, earningsToday, printJobsToday: { totalCompleted, changePercent }, pendingJobs, printers: { online, total }, recentJobs[], printerList[] }

- PATCH /api/shops/:shopId/isopen
  Body: { isOpen: boolean } — toggles shop open/closed and emits dashboard.updated

Realtime
- Socket.IO namespace: default; join room shop:{shopId}
  Events emitted:
  - dashboard.updated: partial snapshot updates (isOpen)
  - job.updated: finaljobs document updated

Cron and TTL
- Daily snapshot at 00:05 local time records previous day completed counts in collection dailyshopstats
- TTL on finaljobs.createdAt expires documents after 24 hours (86400s)

Indexes
- finaljobs: { shop_id: 1, job_status: 1, createdAt: 1 }, TTL on createdAt
- newshops: { shopId: 1 }
- dailyshopstats: { shop_id: 1, date: 1 } unique

Notes
- No schema changes to finaljobs or jobs.
- newshops model includes a lightweight dailystats object (totaljobscompleeted, jobpercentchaneg) that, when present, is preferred to compute Print Jobs Today card.
