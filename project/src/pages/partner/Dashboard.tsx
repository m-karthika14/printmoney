import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Printer, DollarSign, FileText, AlertCircle, ClipboardList } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';
import RevenueGraphSection from '../../components/partner/RevenueGraphSection';
import { fetchDashboard, fetchShop } from '../../lib/api';
import { connectSocket, disconnectSocket, LiveCounts } from '../../lib/socket';

type DashboardSnapshot = {
  shopName: string;
  isOpen: boolean;
  earningsToday: number; // derived from totalRevenue.daily map
  todayJobs: number; // derived from dailystats map
  pendingJobs: number;
  printers: { online: number; total: number };
  recentJobs: Array<{ job_number: string; customer?: any; copies?: number; total_amount?: number; job_status: string }>;
  printerList: Array<{ name: string; type?: string; status: string }>;
};

const Dashboard: React.FC = () => {
  const [shopId, setShopId] = useState<string>('');
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [liveCounts, setLiveCounts] = useState<LiveCounts | null>(null);
  // simple load flag if needed later
  // const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const qs = url.searchParams.get('shop_id') || url.searchParams.get('shopId');
    const stored = window.localStorage.getItem('shop_id') || window.localStorage.getItem('shopId');
    const HEX24 = /^[a-fA-F0-9]{24}$/;
    if (stored && HEX24.test(stored)) {
      try { window.localStorage.removeItem('shopId'); } catch {}
      try { window.localStorage.removeItem('shop_id'); } catch {}
      try { window.localStorage.removeItem('shop_object_id'); } catch {}
      console.warn('[Dashboard] removed legacy Mongo ObjectId from localStorage', stored);
      setShopId('');
      return;
    }
    const sid = (qs && !HEX24.test(qs)) ? qs : (stored && !HEX24.test(stored) ? stored : '');
    if (sid) try { window.localStorage.setItem('shop_id', sid); } catch {}
    setShopId(sid);
  }, []);

  const computeFromShop = (shop: any): DashboardSnapshot => {
    // Try both IST (Asia/Kolkata) and UTC day keys so we pick whichever the server stored.
    const istKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const utcKey = new Date().toISOString().split('T')[0];
    const dailyRevenueMap = shop?.totalRevenue?.daily || {};
    const dsMap = shop?.dailystats || {};
    // Prefer IST bucket if present (matches frontend date display), otherwise fall back to UTC bucket.
    const todayRevenue = (typeof dailyRevenueMap[istKey]?.totalRevenue === 'number')
      ? dailyRevenueMap[istKey].totalRevenue
      : (typeof dailyRevenueMap[utcKey]?.totalRevenue === 'number' ? dailyRevenueMap[utcKey].totalRevenue : 0);
    const todayJobs = (typeof dsMap[istKey]?.totalJobsCompleted === 'number')
      ? dsMap[istKey].totalJobsCompleted
      : (typeof dsMap[utcKey]?.totalJobsCompleted === 'number' ? dsMap[utcKey].totalJobsCompleted : 0);
    const printersArr = Array.isArray(shop.printers) ? shop.printers : [];
    const onlinePrinters = printersArr.filter((p: any) => (p.status || '').toLowerCase() === 'online').length;
    return {
      shopName: shop.shopName || shop.name || '—',
      isOpen: typeof shop.isOpen === 'boolean' ? shop.isOpen : true,
      earningsToday: todayRevenue,
      todayJobs,
      pendingJobs: 0, // will be filled from dashboard snapshot fallback
      printers: { online: onlinePrinters, total: printersArr.length },
      recentJobs: [],
      printerList: printersArr.map((p: any) => ({
        name: p.agentDetected?.name || p.printerid || p.printerId || 'Unknown',
        type: Array.isArray(p.agentDetected?.capabilities) && p.agentDetected.capabilities[0] ? (p.agentDetected.capabilities[0].type || '') : '',
        status: p.status || 'offline'
      }))
    };
  };

  const fetchDashboardData = async (sid: string) => {
    try {
      const [shopObj, dash] = await Promise.all([
        fetchShop(sid),
        fetchDashboard(sid)
      ]);
      // Primary values derived from shop maps per spec; fallback to dashboard counts for pending/jobs/printers/recentJobs
      const base = computeFromShop(shopObj);
      base.pendingJobs = dash?.pendingJobs ?? base.pendingJobs;
      base.recentJobs = Array.isArray(dash?.recentJobs) ? dash.recentJobs : base.recentJobs;
      base.printerList = Array.isArray(dash?.printerList) ? dash.printerList : base.printerList;
      // Use dashboard printers metrics if present (they should match but allow fallback consistency)
      if (dash?.printers) base.printers = dash.printers;
      // Prefer dashboard's computed earningsToday when available (server uses canonical day-key logic)
      base.earningsToday = (typeof dash?.earningsToday === 'number') ? dash.earningsToday : base.earningsToday;
  // Prefer dashboard's todayJobs when available (server-side canonical count derived from dailystats)
  base.todayJobs = (typeof dash?.todayJobs === 'number') ? dash.todayJobs : base.todayJobs;
      setData(base);
    } catch (e) {
      console.error('[Dashboard] fetch failed:', e);
    }
  };

  useEffect(() => {
    if (!shopId) return;
    fetchDashboardData(shopId);
    const t = setInterval(() => fetchDashboardData(shopId), 10000);
    return () => clearInterval(t);
  }, [shopId]);

  // Instant updates via Socket.IO for counts
  useEffect(() => {
    if (!shopId) return;
    const socket = connectSocket(shopId);
    const onCounts = (c: LiveCounts) => {
      setLiveCounts(c);
      // Refresh both shop and dashboard snapshots immediately (dashboard includes server-side computed earningsToday)
      try { fetchDashboardData(shopId); } catch (e) { console.error('[Dashboard] socket refresh failed', e); }
    };
    socket.on('counts', onCounts);
    return () => {
      try { socket.off('counts', onCounts); } catch {}
      disconnectSocket();
    };
  }, [shopId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'printing': return 'text-orange-600 bg-orange-100';
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  const displayCustomer = (c?: any) => {
    if (!c) return '—';
    if (typeof c === 'string') return c;
    if (c.name) return String(c.name);
    if (c.email) return String(c.email);
    if (c.phone) return String(c.phone);
    if (c._id) return String(c._id);
    try { return JSON.stringify(c); } catch { return '—'; }
  };

  return (
    <PartnerLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-lime-500 to-emerald-500 rounded-2xl p-6 text-white mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Hi {data?.shopName || '—'}! 👋</h1>
              <p className="text-lime-100 mt-2">{`Here's your dashboard overview for today (IST: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })})`}</p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <p className="text-sm text-lime-100">Shop Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${data?.isOpen ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="font-semibold">{data?.isOpen ? 'Open & Accepting Jobs' : 'Closed'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Earnings (dummy) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">₹{(data?.earningsToday ?? 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-lime-100 rounded-xl p-3">
                <DollarSign className="h-6 w-6 text-lime-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-600">—</span>
            </div>
          </motion.div>

          {/* Print Jobs Today (calendar day via NewShop.dailystats) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Print Jobs Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data?.todayJobs ?? 0}</p>
              </div>
              <div className="bg-lime-100 rounded-xl p-3">
                <CheckCircle className="h-6 w-6 text-lime-600" />
              </div>
            </div>
            {/* Using calendar-day snapshot; omit rolling 24h change percent to avoid mixing metrics */}
          </motion.div>

          {/* Pending Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{(liveCounts?.pending ?? data?.pendingJobs) ?? 0}</p>
              </div>
              <div className="bg-lime-100 rounded-xl p-3">
                <Clock className="h-6 w-6 text-lime-600" />
              </div>
            </div>
          </motion.div>

          {/* Printer Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Printer Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data?.printers ? `${data.printers.online}/${data.printers.total}` : '0/0'}</p>
              </div>
              <div className="bg-lime-100 rounded-xl p-3">
                <Printer className="h-6 w-6 text-lime-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-sm font-medium text-green-600">Online</span>
            </div>
          </motion.div>
          
        </div>

        {/* Revenue chart: placed above Recent Jobs */}
        <div>
          <RevenueGraphSection shopId={shopId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Jobs</h2>
              <a href="/job-queue" className="text-lime-600 hover:text-lime-700 font-medium">
                View all →
              </a>
            </div>
            <div className="space-y-4">
              {(data?.recentJobs || []).map((job) => (
                <div key={job.job_number} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-lime-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-lime-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{job.job_number}</p>
                      <p className="text-sm text-gray-600">{displayCustomer(job.customer)} • {typeof job.copies === 'number' ? job.copies : '—'} copies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{(job.total_amount ?? 0).toFixed(2)}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.job_status)}`}>
                        {job.job_status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Printer Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Printer Status</h2>
              <a href="/printers" className="text-lime-600 hover:text-lime-700 font-medium">
                Manage →
              </a>
            </div>
            <div className="space-y-4">
              {(data?.printerList || []).map((printer) => (
                <div key={`${printer.name}-${printer.status}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      printer.status === 'online' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {printer.status === 'online' ? (
                        <Printer className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{printer.name}</p>
                      <p className="text-sm text-gray-600">{printer.type || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      printer.status === 'online' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {printer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/job-queue" className="flex flex-col items-center p-4 bg-lime-50 rounded-xl hover:bg-lime-100 transition-colors duration-200">
              <ClipboardList className="h-8 w-8 text-lime-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Queue</span>
            </a>
            <a href="/pricing" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200">
              <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Update Pricing</span>
            </a>
            <a href="/printers" className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200">
              <Printer className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Printer Settings</span>
            </a>
            {/**
            <a href="/analytics" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200">
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </a>
            **/}
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default Dashboard;