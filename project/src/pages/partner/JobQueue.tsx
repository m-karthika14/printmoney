import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, FileText, User, Phone, Play, Pause } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';
import { apiFetch, fetchDashboard, fetchShop } from '../../lib/api';
import { connectSocket, disconnectSocket, LiveCounts } from '../../lib/socket';

export type QueueJob = {
  finaljobId: string;
  job_number: string;
  job_status: 'pending' | 'printing' | 'completed';
  autoPrintMode: boolean;
  manualTrigger: boolean;
  customer: any;
  payment_status: string;
  createdAt?: string;
  print_options?: { copies?: number; printType?: string; binding?: string | string[] };
  total_amount?: number;
  total_pages?: number;
  total_printed_pages?: number;
  collected?: boolean;
  collectedAt?: string;
};

const JobQueue: React.FC = () => {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoPrintMode, setAutoPrintMode] = useState<boolean>(true);
  const [counts, setCounts] = useState<{ printing: number; completed: number; total: number }>({ printing: 0, completed: 0, total: 0 });
  const [shopId, setShopId] = useState<string>('');
  const [isPolling] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<Set<string>>(new Set());
  const [collecting, setCollecting] = useState<Set<string>>(new Set());
  const [todayJobs, setTodayJobs] = useState<number>(0);
  const [todayJobsDate, setTodayJobsDate] = useState<string | null>(null);
  // ...existing code...

  const printingCount = counts.printing;
  const completedCount = counts.completed;
      // First try the dedicated dailystats endpoint which returns normalized entries

  const formatTime = (timeString: string) => new Date(timeString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const formatDate = (timeString: string) => new Date(timeString).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      try {
        const resp = await apiFetch(`/api/shops/${encodeURIComponent(shopId)}/dailystats?limit=1`);
        if (resp.ok) {
          const body = await resp.json();
          if (body && Array.isArray(body.data) && body.data.length > 0) {
            const first = body.data[0];
            const val = typeof first.totalJobsCompleted === 'number' ? first.totalJobsCompleted : (typeof first.completedCount === 'number' ? first.completedCount : 0);
            setTodayJobs(val);
            setTodayJobsDate(first.date || null);
            console.log('[JobQueue] used dailystats endpoint', { date: first.date, value: val });
            return;
          }
        }
      } catch (errDs) {
        console.warn('[JobQueue] dailystats endpoint failed', errDs);
      }

      // Fallback: fetch full shop object and try to read dailystats map
      try {
        const shop = await fetchShop(shopId);
        const ds = shop?.dailystats || {};
        const entry = ds[istKey] || ds[utcKey] || null;
        let used = entry;
        if (!used) {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const yIst = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const yUtc = new Date(yesterday).toISOString().split('T')[0];
          used = ds[yIst] || ds[yUtc] || {};
        }
        const val = (used && typeof used.totalJobsCompleted === 'number') ? used.totalJobsCompleted : (used && typeof used.completedCount === 'number' ? used.completedCount : 0);
        // Try to find which key matched
        let usedDate: string | null = null;
        for (const k of Object.keys(ds || {})) {
          try {
            const v = (ds as any)[k];
            if (v && (v.totalJobsCompleted === used.totalJobsCompleted || v.completedCount === used.completedCount)) { usedDate = k; break; }
          } catch {}
        }
        setTodayJobs(val);
        setTodayJobsDate(usedDate || null);
        console.log('[JobQueue] fallback shop dailystats', { istKey, utcKey, usedDate, value: val });
        return;
      } catch (shopErr) {
        console.warn('[JobQueue] fetchShop fallback failed', shopErr);
      }
  const resp = await apiFetch(`/api/jobs/queue/${shopId}`);
      if (!resp.ok) throw new Error('Failed to fetch queue');
      const data = await resp.json();
      const list: QueueJob[] = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(list);
      // Keep dimming state only for jobs still pending
      setTriggering(prev => {
        const next = new Set<string>();
        for (const id of prev) {
          const found = list.find(j => j.finaljobId === id);
          if (found && found.job_status === 'pending') next.add(id);
        }
        return next;
      });
      setCounts(data.counts || { printing: 0, completed: 0, total: 0 });
      const mode = typeof data.autoPrintMode === 'boolean' ? data.autoPrintMode : list.some(j => j.autoPrintMode === true);
      setAutoPrintMode(mode);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
  }, [shopId]);

  const fetchTotals = useCallback(async () => {
    if (!shopId) return;
    try {
      // Derive todayJobs from NewShop.dailystats per spec
      const shop = await fetchShop(shopId);
      const istKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const utcKey = new Date().toISOString().split('T')[0];
      // Normalize possible shapes: Map (when returned by Mongoose), plain object, or wrapper
      let ds: any = {};
      try {
        if (!shop || !shop.dailystats) ds = {};
        else if (Array.isArray(shop.dailystats)) {
          // Some endpoints may return an array of entries
          for (const e of shop.dailystats) { if (e && e.date) ds[e.date] = e; }
        } else if (typeof shop.dailystats === 'object' && !(shop.dailystats instanceof Map)) {
          ds = shop.dailystats;
        } else if (shop.dailystats instanceof Map) {
          // When Mongoose returns a Map it may appear as actual Map in some environments
          ds = Object.fromEntries(shop.dailystats);
        } else if (typeof shop.dailystats === 'string') {
          // Guard: sometimes serialized JSON may come as string
          try { ds = JSON.parse(shop.dailystats); } catch { ds = {}; }
        } else {
          // Fallback: attempt to coerce
          ds = Object.assign({}, shop.dailystats);
        }
      } catch (normErr) {
        console.warn('[JobQueue] failed to normalize dailystats', normErr, shop && shop.dailystats);
        ds = shop?.dailystats || {};
      }
      // Prefer the IST calendar-day key if present, otherwise fallback to UTC key.
      let entry = ds[istKey] || ds[utcKey] || null;
      // If today's entry is missing, fall back to yesterday (helps when today's bucket hasn't been populated yet)
      if (!entry) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yIst = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const yUtc = new Date(yesterday).toISOString().split('T')[0];
        entry = ds[yIst] || ds[yUtc] || {};
      }
      // Some older snapshots use `completedCount` instead of `totalJobsCompleted`.
      const today = (typeof entry.totalJobsCompleted === 'number')
        ? entry.totalJobsCompleted
        : (typeof entry.completedCount === 'number' ? entry.completedCount : 0);
      // Helpful debug (can remove later) if you see unexpected zeros
      // Use console.log so it's visible in DevTools default filter
      console.log('[JobQueue] dailystats lookup', { istKey, utcKey, usedEntry: entry });
      // Record which date key we used (prefer IST key, otherwise UTC or yesterday fallback)
      const usedDateKey = (ds && ds[istKey]) ? istKey : ((ds && ds[utcKey]) ? utcKey : null);
      // If today's keys missing but entry came from yesterday's fallback, compute that key
      let usedDate = usedDateKey;
      if (!usedDate && entry) {
        // try to find date in ds map that matches entry reference
        for (const k of Object.keys(ds || {})) {
          try {
            const val = (ds as any)[k];
            if (val === entry || (val && JSON.stringify(val) === JSON.stringify(entry))) { usedDate = k; break; }
          } catch {}
        }
      }
      setTodayJobsDate(usedDate || null);
      setTodayJobs(today);
    } catch (e) {
      console.error('[JobQueue] totals fetch failed; falling back to dashboard:', e);
      try {
        const dash = await fetchDashboard(shopId);
        if (dash && typeof dash.todayJobs === 'number') setTodayJobs(dash.todayJobs);
      } catch {}
    }
  }, [shopId]);

  const toggleAutoPrint = async () => {
    if (!shopId) return;
    try {
      const next = !autoPrintMode;
  const resp = await apiFetch(`/api/finaljobs/autoprint/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoPrintMode: next })
      });
      if (!resp.ok) throw new Error('Failed to update autoPrintMode');
      // Prefer server-confirmed value when available, fall back to optimistic toggle
      let confirmed = next;
      try {
        const body = await resp.json();
        if (body && typeof body.autoPrintMode === 'boolean') confirmed = body.autoPrintMode;
      } catch (err) {
        // ignore parse errors and keep optimistic value
      }
      setAutoPrintMode(confirmed);
      // Don't immediately re-fetch the whole queue here — the server may not have
      // fully propagated the change yet and an immediate fetch can read stale
      // data which causes the UI to revert. Polling (already enabled) will
      // reconcile the queue shortly.
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualPrint = async (finaljobId: string) => {
    // Block in auto mode or if already triggering (prevents double clicks before re-render)
    if (autoPrintMode || triggering.has(finaljobId)) return;
    try {
      // Optimistically dim + disable this job's Print button
      setTriggering(prev => new Set(prev).add(finaljobId));
      const resp = await apiFetch(`/api/finaljobs/${finaljobId}/manual`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualTrigger: true })
      });
      if (!resp.ok) throw new Error('Failed to trigger manual print');
      fetchQueue();
    } catch (e) {
      console.error(e);
      // Revert dim state on error
      setTriggering(prev => {
        const next = new Set(prev);
        next.delete(finaljobId);
        return next;
      });
    }
  };

  const refreshJobs = useCallback(() => { fetchQueue(); fetchTotals(); }, [fetchQueue, fetchTotals]);

  useEffect(() => {
    let t: any;
    if (isPolling) t = setInterval(refreshJobs, 5000);
    return () => t && clearInterval(t);
  }, [isPolling, refreshJobs]);

  useEffect(() => { if (shopId) { fetchQueue(); fetchTotals(); } }, [shopId, fetchQueue, fetchTotals]);

  // Instant updates via Socket.IO
  useEffect(() => {
    if (!shopId) return;
    const socket = connectSocket(shopId);
    const onCounts = (c: LiveCounts) => {
      setCounts({ printing: c.printing, completed: c.completed, total: c.pending + c.printing + c.completed });
      // Refresh totals so "Total Jobs Today" updates instantly
      try { fetchTotals(); } catch (err) { /* ignore */ }
    };
    const onJob = () => { fetchQueue(); fetchTotals(); };
    socket.on('counts', onCounts);
    socket.on('finaljob:update', onJob);
    return () => {
      try { socket.off('counts', onCounts); socket.off('finaljob:update', onJob); } catch {}
      disconnectSocket();
    };
  }, [shopId, fetchQueue, fetchTotals]);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Queue</h1>
            <p className="text-gray-600 mt-2">Manage and track all print jobs</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white rounded-full p-1 shadow-sm border border-gray-200">
              <button onClick={() => { if (!autoPrintMode) toggleAutoPrint(); }} className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${autoPrintMode ? 'bg-lime-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`} aria-pressed={autoPrintMode} title="Automatic printing mode">
                <div className="flex items-center space-x-2"><Play className="h-4 w-4" /><span className="text-sm">Auto</span></div>
              </button>
              <button onClick={() => { if (autoPrintMode) toggleAutoPrint(); }} className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${!autoPrintMode ? 'bg-lime-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`} aria-pressed={!autoPrintMode} title="Manual printing mode">
                <div className="flex items-center space-x-2"><Pause className="h-4 w-4" /><span className="text-sm">Manual</span></div>
              </button>
            </div>
            <button onClick={refreshJobs} className="flex items-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-600 transition-colors duration-200"><RefreshCw className="h-5 w-5" /><span>Refresh</span></button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Printing</p><p className="text-2xl font-bold text-gray-900 mt-1">{printingCount}</p></div><div className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">Live</div></div></div>
          <div className="bg-white rounded-2xl shadow-lg p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">Completed</p><p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p></div><div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Live</div></div></div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{todayJobs}</p>
                {todayJobsDate && (
                  <p className="text-xs text-gray-500 mt-1">Latest: {todayJobsDate}</p>
                )}
              </div>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-lime-100 text-lime-800">Today</div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Job Queue</h2>
              <div className="text-sm text-gray-600 text-right">
                <div>Last updated: {lastUpdate.toLocaleTimeString('en-IN')}</div>
                <div className="text-xs text-gray-500 mt-1">Shop: {shopId || '—'}</div>
                <div className="text-xs text-gray-500">Mode: {autoPrintMode ? 'Automatic' : 'Manual'}</div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map(job => {
                  const isManualTriggered = !!job.manualTrigger;
                  const isTriggering = isManualTriggered || triggering.has(job.finaljobId);
                  const printDisabled = autoPrintMode || job.job_status !== 'pending' || isTriggering;
                  const copies = job.print_options?.copies ?? '—';
                  const printTypeRaw = (job.print_options?.printType as string) || 'mixed';
                  const printType = printTypeRaw.toString();
                  const typeTone = (() => {
                    const v = printType.toLowerCase();
                    if (v.includes('color') && v.includes('bw')) return 'bg-indigo-100 text-indigo-800';
                    if (v.includes('color')) return 'bg-purple-100 text-purple-800';
                    if (v.includes('bw') || v.includes('b/w')) return 'bg-gray-100 text-gray-700';
                    return 'bg-blue-100 text-blue-800';
                  })();
                  const toArr = (v: unknown): string[] => Array.isArray(v) ? (v as any[]).map(String) : (v ? [String(v)] : []);
                  const bindings = Array.from(new Set([
                    ...toArr(job.print_options?.binding),
                    ...toArr((job.print_options as any)?.services)
                  ]));
                  return (
                    <tr key={job.finaljobId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="bg-lime-100 p-2 rounded-lg"><FileText className="h-5 w-5 text-lime-600" /></div>
                          <div>
                            <p className="font-bold text-gray-900">{job.job_number}</p>
                            {job.createdAt && (<p className="text-xs text-gray-500 mt-1">{formatDate(job.createdAt)} • {formatTime(job.createdAt)}</p>)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="grid grid-cols-[auto,1fr] grid-rows-2 gap-x-3 gap-y-1 items-center">
                          {/* Left column: icons aligned with each row */}
                          <div className="row-start-1 row-end-2 flex items-center">
                            <User className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="row-start-2 row-end-3 flex items-center">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>

                          {/* Right column: name and phone text */}
                          <div className="row-start-1 row-end-2 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{displayCustomer(job.customer)}</p>
                          </div>
                          <div className="row-start-2 row-end-3 min-w-0">
                            <div className="text-sm text-gray-600">
                              <span className="truncate">{displayPhone(job.customer)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-3">
                          {/* Badges row */}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                              Copies: <span className="ml-1 font-semibold">{copies}</span>
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full capitalize ${typeTone}`}>
                              Type: <span className="ml-1 font-semibold">{printType || '—'}</span>
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              Pages: <span className="ml-1 font-semibold">{typeof job.total_pages === 'number' ? job.total_pages : '—'}</span>
                            </span>
                          </div>

                          {/* Services chips */}
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${bindings.length === 0 ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {`Services: ${bindings.length === 0 ? 'None' : bindings.join(', ')}`}
                            </span>
                          </div>

                          {/* Price + Payment status */}
                          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">{formatAmount(job.total_amount)}</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${job.payment_status === 'pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {job.payment_status === 'pending' ? 'Not Paid' : 'Paid'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                          <div className="text-sm">
                          <p className="text-gray-900 font-medium">{(typeof job.total_printed_pages === 'number' ? job.total_printed_pages : '—')} / {(typeof job.total_pages === 'number' ? job.total_pages : '—')} pages</p>
                          <p className="text-xs text-gray-500 mt-1">Status: <span className={`font-medium capitalize ${job.job_status === 'completed' ? 'text-green-600' : job.job_status === 'printing' ? 'text-orange-600' : 'text-gray-600'}`}>{job.job_status}</span></p>
                          {job.job_status === 'printing' && (<div className="mt-2 w-full bg-gray-200 rounded-full h-2"><div className="bg-lime-500 h-2 rounded-full transition-all duration-300" style={{ width: `30%` }} /></div>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex flex-col items-start space-y-2">
                          {/* Print button on top */}
                          <button
                            onClick={() => handleManualPrint(job.finaljobId)}
                            disabled={printDisabled}
                            className={`px-3 py-1 rounded-md text-sm font-semibold transition focus:outline-none ${printDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-lime-500 text-white hover:bg-lime-600'} ${isTriggering ? 'opacity-60 cursor-wait pointer-events-none' : ''}`}
                            title={autoPrintMode ? 'Disabled in Auto mode' : job.job_status !== 'pending' ? 'Only pending jobs can be triggered' : 'Start manual print'}
                          >
                            Print
                          </button>

                          {/* mode/trigger words below the Print button */}
                          <div className="text-xs text-gray-400">
                            {autoPrintMode ? 'Auto mode' : 'Manual mode'}{job.manualTrigger ? ' • Manual triggered' : ''}
                          </div>

                          {/* Collect button (only for completed jobs) below the words */}
                          {job.job_status === 'completed' && (
                            <div className="flex flex-col items-start">
                              <button
                                onClick={async () => {
                                  if (job.collected) return;
                                  if (collecting.has(job.finaljobId)) return;
                                  try {
                                    setCollecting(prev => new Set(prev).add(job.finaljobId));
                                    const resp = await apiFetch(`/api/finaljobs/${job.finaljobId}/collect`, { method: 'PATCH' });
                                    if (!resp.ok) {
                                      try { const e = await resp.json(); console.error('Collect failed', e); } catch {};
                                      throw new Error('Collect failed');
                                    }
                                    fetchQueue();
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setCollecting(prev => {
                                      const next = new Set(prev);
                                      next.delete(job.finaljobId);
                                      return next;
                                    });
                                  }
                                }}
                                disabled={!!job.collected || collecting.has(job.finaljobId)}
                                className={`px-3 py-1 rounded-md text-sm font-semibold transition focus:outline-none ${job.collected ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-lime-500 text-white hover:bg-lime-600'} ${collecting.has(job.finaljobId) ? 'opacity-60 cursor-wait' : ''}`}
                                title={job.collected ? 'Already collected' : 'Mark as collected'}
                              >
                                {job.collected ? 'Collected' : 'Collect'}
                              </button>

                              {job.collected && job.collectedAt && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Collected: {formatDate(job.collectedAt)} {formatTime(job.collectedAt)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default JobQueue;