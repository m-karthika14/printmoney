import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';
import { apiFetch } from '../../lib/api';

type QueueJob = {
  finaljobId: string;
  job_number: string;
  job_status: 'pending' | 'printing' | 'completed';
  customer?: string;
  createdAt?: string;
  updatedAt?: string;
  completed_at?: string;
  print_options?: { copies?: number; printType?: string };
  total_amount?: number | string;
  current_file?: string;
  document_urls?: string[];
};

type DailyStat = { date: string; totalJobsCompleted: number; createdAt?: string };

const PrintHistory: React.FC = () => {
  // Filters
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '9h' | '6h' | '4h' | '1h' | 'all'>('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'color' | 'bw'>('all');

  // Data
  const [shopId, setShopId] = useState('');
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [dailystats, setDailystats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grandRevenue, setGrandRevenue] = useState<number>(0);

  // Resolve shopId from URL/localStorage (canonical like T47439k)
  useEffect(() => {
    const url = new URL(window.location.href);
    const qsShop = url.searchParams.get('shop_id') || url.searchParams.get('shopId') || undefined;
    const stored = window.localStorage.getItem('shop_id') || window.localStorage.getItem('shopId') || undefined;
    const HEX24 = /^[a-fA-F0-9]{24}$/;
    const sid = (qsShop && !HEX24.test(qsShop)) ? qsShop : (stored && !HEX24.test(stored) ? stored : '');
    if (qsShop && !HEX24.test(qsShop)) {
      window.localStorage.setItem('shop_id', qsShop);
    }
    if (stored && HEX24.test(stored)) {
      try { window.localStorage.removeItem('shopId'); } catch {}
      try { window.localStorage.removeItem('shop_id'); } catch {}
    }
    setShopId(sid || '');
  }, []);

  const fetchData = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const [queueRes, dsRes, shopSumRes] = await Promise.all([
        apiFetch(`/api/jobs/queue/${sid}`),
        apiFetch(`/api/shops/${sid}/dailystats?limit=365`),
        apiFetch(`/api/shops/${sid}/total-revenue?sum=true`)
      ]);
      if (!queueRes.ok) throw new Error('Failed to fetch jobs');
      if (!dsRes.ok) throw new Error('Failed to fetch dailystats');
      const queueJson = await queueRes.json();
      const dsJson = await dsRes.json();
      const list: QueueJob[] = Array.isArray(queueJson.jobs) ? queueJson.jobs : [];
      setJobs(list);
      const ds: DailyStat[] = Array.isArray(dsJson.data) ? dsJson.data : [];
      setDailystats(ds);
      try {
        const json = await shopSumRes.json();
        if (typeof json.total === 'number') setGrandRevenue(json.total);
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (shopId) fetchData(shopId); }, [shopId, fetchData]);

  // Helpers
  const formatAmount = (val: unknown) => {
    const n = typeof val === 'number' ? val : (typeof val === 'string' ? Number(val) : NaN);
    if (!Number.isFinite(n)) return '₹—';
    return `₹${n.toFixed(2)}`;
  };
  const basename = (s?: string) => {
    if (!s) return undefined;
    try { return decodeURIComponent(s.split('/').pop() || s); } catch { return s.split('/').pop() || s; }
  };
  // Time filters should use createdAt primarily (as requested), then fallback
  const pickWhen = (j: QueueJob) => j.createdAt || j.updatedAt || j.completed_at || '';
  const parseDate = (s?: string) => s ? new Date(s) : null;
  const formatDateTime = (s?: string) => {
    const d = parseDate(s);
    if (!d) return '—';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Derived: Completed jobs only
  const completedJobs = useMemo(() => jobs.filter(j => j.job_status === 'completed'), [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (timeRange === 'today') {
      start = new Date(); start.setHours(0,0,0,0);
    } else if (timeRange === '24h') {
      start = new Date(now.getTime() - 24*60*60*1000);
    } else if (timeRange === '9h') {
      start = new Date(now.getTime() - 9*60*60*1000);
    } else if (timeRange === '6h') {
      start = new Date(now.getTime() - 6*60*60*1000);
    } else if (timeRange === '4h') {
      start = new Date(now.getTime() - 4*60*60*1000);
    } else if (timeRange === '1h') {
      start = new Date(now.getTime() - 1*60*60*1000);
    }

    const term = searchTerm.trim().toLowerCase();
    return completedJobs.filter(j => {
      // time filter using completed_at -> updatedAt -> createdAt
      const when = pickWhen(j);
      if (start && when) {
        const dt = new Date(when);
        if (dt < start) return false;
      }
      // color/bw filter from print_options.printType
      const pt = (j.print_options?.printType || '').toString().toLowerCase();
      if (filterType === 'color' && pt !== 'color') return false;
      if (filterType === 'bw' && pt !== 'bw' && pt !== 'black_and_white' && pt !== 'blackwhite') return false;
      // search on file name or customer
      if (term) {
        const fname = basename(j.current_file) || basename(j.document_urls?.[0]) || '';
        const customer = (j.customer || '').toLowerCase();
        const match = fname.toLowerCase().includes(term) || customer.includes(term) || (j.job_number || '').toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => {
      const ad = new Date(pickWhen(a) || 0).getTime();
      const bd = new Date(pickWhen(b) || 0).getTime();
      return bd - ad;
    });
  }, [completedJobs, timeRange, searchTerm, filterType]);

  // Cards: revenue from filtered jobs, completed jobs from dailystats (all-time snapshot sum)
  // Total Revenue card now shows grand total across all shops from backend

  const allTimeCompleted = useMemo(() => dailystats.reduce((sum, d) => sum + (typeof d.totalJobsCompleted === 'number' ? d.totalJobsCompleted : 0), 0), [dailystats]);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Print History</h1>
            <p className="text-gray-600 mt-2">View and manage completed print jobs</p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-baseline justify-between w-full">
              <h3 className="text-sm font-medium text-black">Total Revenue</h3>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(grandRevenue)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-baseline justify-between w-full">
              <h3 className="text-sm font-medium text-black">Completed Jobs</h3>
              <p className="text-2xl font-bold text-gray-900">{allTimeCompleted}</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search file name or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 w-64"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              >
                <option value="all">All Types</option>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="today">Today (calendar)</option>
              <option value="24h">Last 24 hours</option>
              <option value="9h">Last 9 hours</option>
              <option value="6h">Last 6 hours</option>
              <option value="4h">Last 4 hours</option>
              <option value="1h">Last 1 hour</option>
              <option value="all">All available</option>
            </select>
          </div>
        </motion.div>

        {/* History List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Completed Jobs</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading && (
              <div className="p-6 text-gray-600">Loading…</div>
            )}
            {error && !loading && (
              <div className="p-6 text-red-600">{error}</div>
            )}
            {!loading && !error && filteredJobs.length === 0 && (
              <div className="p-6 text-gray-600">No completed jobs in the selected window.</div>
            )}
            {!loading && !error && filteredJobs.map((job) => {
              const copies = job.print_options?.copies;
              const ptype = (job.print_options?.printType || '').toString().toLowerCase();
              const tagCls = ptype === 'color' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
              return (
                <div key={job.finaljobId} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="bg-green-100 p-3 rounded-xl shrink-0">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{job.job_number || '—'}</h3>
                        </div>
                        <p className="text-gray-600 mb-1 truncate">{job.customer || 'guest'}</p>
                        <p className="text-sm text-gray-500 mb-2">{formatDateTime(pickWhen(job))}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {typeof copies === 'number' && <span>{copies} copies</span>}
                          {ptype && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${tagCls}`}>
                              {ptype === 'color' ? 'Color' : 'B&W'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm text-gray-500 mb-1">Amount</div>
                      <div className="text-lg font-semibold text-gray-900">{formatAmount(job.total_amount)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default PrintHistory;