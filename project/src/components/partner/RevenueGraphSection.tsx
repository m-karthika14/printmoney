import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
// Using native buttons here to avoid a hard dependency on a specific Button component path

const data7d = [
  { date: "Oct 20", revenue: 2800 },
  { date: "Oct 21", revenue: 3200 },
  { date: "Oct 22", revenue: 2900 },
  { date: "Oct 23", revenue: 3800 },
  { date: "Oct 24", revenue: 4200 },
  { date: "Oct 25", revenue: 4500 },
  { date: "Oct 26", revenue: 3900 },
];

const data30d = [
  { date: "Oct 1", revenue: 2800 },
  { date: "Oct 5", revenue: 3200 },
  { date: "Oct 10", revenue: 3600 },
  { date: "Oct 15", revenue: 4100 },
  { date: "Oct 20", revenue: 3800 },
  { date: "Oct 25", revenue: 4500 },
  { date: "Oct 30", revenue: 4200 },
];

const data90d = [
  { date: "Aug", revenue: 18200 },
  { date: "Sep", revenue: 21500 },
  { date: "Oct", revenue: 25800 },
];

const CustomTooltip = ({ active, payload, label, isDark }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const date = item?.payload?.date ?? label;
    const value = item?.value ?? 0;

    if (isDark) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="glass-card p-3 border-lime-400/30"
          style={{ minWidth: 140 }}
        >
          <div className="text-xs text-lime-300 mb-1">{date}</div>
          <div className="text-sm font-semibold gradient-text">₹{Number(value).toLocaleString("en-IN")}</div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="bg-white text-black p-3 rounded-md shadow-md border border-gray-100"
        style={{ minWidth: 140 }}
      >
        <div className="text-xs text-gray-500 mb-1">{date}</div>
        <div className="text-sm font-semibold">₹{Number(value).toLocaleString("en-IN")}</div>
      </motion.div>
    );
  }
  return null;
};

type RevenueProps = { shopId?: string };

const RevenueChart = ({ shopId: propShopId }: RevenueProps) => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");
  const [chartData, setChartData] = useState<Array<{ date: string; label: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<number | null>(null);

  // resolve shop identifier (prefer propShopId, then canonical shop_id from query/localStorage)
  const resolveShopId = () => {
    if (propShopId && propShopId.length > 0) return propShopId;
    if (typeof window === 'undefined') return '';
    const qs = new URL(window.location.href).searchParams.get('shop_id') || new URL(window.location.href).searchParams.get('shopId');
    const stored = window.localStorage.getItem('shop_id') || window.localStorage.getItem('shopId');
    return (qs && qs.length > 0) ? qs : (stored && stored.length > 0 ? stored : '');
  };

  const buildChartFromResponse = (json: any, range: "7d" | "30d" | "90d") => {
    // prefer daily array for 7/30, monthly for 90
    const daily = Array.isArray(json?.daily) ? json.daily.slice() : [];
    const monthly = Array.isArray(json?.monthly) ? json.monthly.slice() : [];

    // sort ascending by date
    daily.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
    monthly.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

    if (range === '7d' || range === '30d') {
      const days = range === '7d' ? 7 : 30;
      const src = daily.length ? daily : (range === '7d' ? data7d.map(d=>({ date: d.date, totalRevenue: d.revenue })) : data30d.map(d=>({ date: d.date, totalRevenue: d.revenue })));
      const last = src.slice(-days);
      return last.map((it: any) => ({ date: it.date, label: formatShortLabel(it.date), revenue: Number(it.totalRevenue || 0) }));
    }

    // 90d -> use monthly if available else aggregate last 90 days into months
    if (monthly.length) {
      const last = monthly.slice(-3); // last 3 months
      return last.map((it: any) => ({ date: it.date, label: formatMonthLabel(it.date), revenue: Number(it.totalRevenue || 0) }));
    }

    // fallback: aggregate daily into monthly buckets for last 90 days
    const map: Record<string, number> = {};
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    daily.forEach((d: any) => {
      const dt = new Date(d.date);
      if (dt >= cutoff) {
        const m = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
        map[m] = (map[m] || 0) + Number(d.totalRevenue || 0);
      }
    });
    const rows = Object.keys(map).sort().map(k => ({ date: k, label: formatMonthLabel(k), revenue: map[k] }));
    return rows;
  };

  const fetchRevenue = async () => {
    const shopId = resolveShopId();
    if (!shopId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${encodeURIComponent(shopId)}/revenue`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      const built = buildChartFromResponse(json, timeRange);
      setChartData(built);
    } catch (err) {
      // fallback to demo data
      if (timeRange === '7d') setChartData(data7d.map(d => ({ date: d.date, label: d.date, revenue: d.revenue })));
      else if (timeRange === '30d') setChartData(data30d.map(d => ({ date: d.date, label: d.date, revenue: d.revenue })));
      else setChartData(data90d.map(d => ({ date: d.date, label: d.date, revenue: d.revenue })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial fetch + polling
    fetchRevenue();
    // clear previous
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(fetchRevenue, 60 * 60 * 1000); // hourly
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const getData = () => {
    if (chartData && chartData.length) return chartData;
    switch (timeRange) {
      case "7d":
        return data7d.map(d=>({ date: d.date, label: d.date, revenue: d.revenue }));
      case "30d":
        return data30d.map(d=>({ date: d.date, label: d.date, revenue: d.revenue }));
      case "90d":
        return data90d.map(d=>({ date: d.date, label: d.date, revenue: d.revenue }));
    }
  };

  // Progressive grouping utility: always aim to show 10 bars by aggregating older data in chunks of 10


  const aggregate = (chunk: Array<any>) => ({
    date: `${chunk[0].date}–${chunk[chunk.length - 1].date}`,
    label: formatRangeLabel(chunk[0].date, chunk[chunk.length - 1].date),
    // Use SUM for grouped bars (total revenue for the chunk)
    revenue: chunk.reduce((sum, d) => sum + (d.revenue || 0), 0),
  });

  const groupRevenueData = (dataArr: Array<any>) => {
    if (!Array.isArray(dataArr)) return [];
    const data = dataArr.slice(); // copy
    const n = data.length;
    if (n <= 10) return data;
    // determine groupSize in tens: floor((n-1)/9) * 10
    let groupSize = Math.floor((n - 1) / 9) * 10;
    // ensure groupSize leaves at most 9 items for the tail
    groupSize = Math.min(groupSize, Math.max(0, n - 9));
    if (groupSize <= 0) return data.slice(-10);
  const groupedChunk = data.slice(0, groupSize);
  const grouped = aggregate(groupedChunk);
    // take next up to 9 items after the grouped chunk
    const tail = data.slice(groupSize, groupSize + 9);
    return [grouped, ...tail];
  };

  // Friendly range label formatter: try to parse ISO dates, otherwise fallback to raw
  const formatRangeLabel = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sLabel = s.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const eLabel = e.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return `${sLabel}–${eLabel}`;
    } catch (e) {
      return `${start}–${end}`;
    }
  };

  // helpers
  function formatShortLabel(d: string) {
    try { const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch(e) { return String(d); }
  }
  function formatMonthLabel(d: string) {
    try { const parts = d.split('-'); const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, 1); return dt.toLocaleDateString('en-US', { month: 'short' }); } catch(e) { return String(d); }
  }

  // custom tick renderers to force inline black text (avoids CSS overrides)
  const renderXTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <text x={x} y={y + 12} textAnchor="middle" fill="#000000" fontSize={12} fontWeight={600}>
        {String(payload.value)}
      </text>
    );
  };

  const renderYTick = (props: any) => {
    const { x, y, payload } = props;
    // payload.value is the numeric tick
    const val = payload && typeof payload.value !== 'undefined' ? payload.value : '';
    // format similar to tickFormatter
    const label = typeof val === 'number' ? `₹${(val/1000).toFixed(1)}k` : String(val);
    return (
      <text x={x - 8} y={y + 4} textAnchor="end" fill="#000000" fontSize={12} fontWeight={600}>
        {label}
      </text>
    );
  };

  // compute grouped/visible dataset so chart always shows ~10 bars
  const visibleData = groupRevenueData(getData() || []);

  // determine bar width based on number of visible bars (thicker when fewer bars)
  const barSize = (() => {
    const n = (visibleData && visibleData.length) || 0;
    if (n <= 0) return 12;
    if (n <= 5) return 36; // very few bars -> thicker
    if (n <= 10) return 28; // target size
    // many bars -> scale down but keep readable min
    return Math.max(10, Math.floor(300 / n));
  })();

  return (
    <motion.div
      id="revenue-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="bg-white rounded-2xl p-8 col-span-2 text-black shadow-lg"
    >
      <style>{`
        /* Scoped to revenue card to override any global SVG/text styles for light card */
        #revenue-card .recharts-cartesian-axis text,
        #revenue-card .recharts-cartesian-axis-label,
        #revenue-card .recharts-tooltip-inner,
        #revenue-card .recharts-tooltip-wrapper * {
          fill: #000000 !important;
          color: #000000 !important;
        }
        #revenue-card .recharts-cartesian-axis-line,
        #revenue-card .recharts-cartesian-axis-tick line {
          stroke: rgba(0,0,0,0.85) !important;
        }
        #revenue-card .recharts-cartesian-grid-horizontal line {
          stroke: rgba(0,0,0,0.06) !important;
        }
        #revenue-card .recharts-layer .recharts-rectangle {
          /* keep bars as-is */
        }
        /* make pill buttons clearly black text */
        #revenue-card button { color: #000000 !important; }
        #revenue-card .recharts-tooltip-wrapper { z-index: 9999 !important; }
      `}</style>
      <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">Revenue Overview</h2>
              <p className="text-sm text-black/70 mt-1">Visualize earnings over time</p>
            </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={
                `px-3 py-1 rounded-md text-sm font-medium transition ${
                  timeRange === range
                    ? "bg-gray-100 text-black border border-gray-200 shadow-sm"
                    : "bg-transparent border border-gray-100 text-black/80 hover:bg-gray-50"
                }`
              }
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={timeRange}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="h-[400px]"
      >
        {/* Force Recharts SVG axis/text colors so they are visible on the light/white card. */}
        <style>{`
          .recharts-cartesian-axis text, .recharts-cartesian-axis-label { fill: rgba(0,0,0,0.95) !important; }
          .recharts-cartesian-axis-line { stroke: rgba(0,0,0,0.9) !important; }
          .recharts-cartesian-axis-tick line { stroke: rgba(0,0,0,0.85) !important; }
          .recharts-tooltip-wrapper { z-index: 9999 !important; }
        `}</style>
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(84, 81%, 44%)" stopOpacity={0.9} />
                <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(160, 84%, 25%)" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            {/* theme-aware axis colors so lines are visible on light backgrounds */}
            {(() => {
              // Card is light — use black labels/ticks for high contrast
              const cardDark = false;
              const gridColor = cardDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
              const axisStrokeWidth = cardDark ? 1 : 1.4;
              const tickLineVisible = true;
              return (
                <>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#000000"
                    axisLine={{ stroke: '#000000', strokeWidth: axisStrokeWidth }}
                    tickLine={tickLineVisible}
                    tick={renderXTick}
                    padding={{ left: 10, right: 10 }}
                    tickMargin={8}
                    interval={0}
                    label={{ value: 'Date', position: 'bottom', offset: 10, style: { fill: '#000000', fontSize: 12 } }}
                  />
                  <YAxis
                    stroke="#000000"
                    axisLine={{ stroke: '#000000', strokeWidth: axisStrokeWidth }}
                    tickLine={tickLineVisible}
                    tick={renderYTick}
                    interval={0}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}k`}
                    label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft', offset: 8, style: { fill: '#000000', fontSize: 12 } }}
                  />
                </>
              );
            })()}
            {/* tooltip: use light/white tooltip for white card; disable the hover cursor highlight */}
            <Tooltip content={<CustomTooltip isDark={false} />} cursor={false} />
                      <Bar
                        dataKey="revenue"
                        fill="url(#barGradient)"
                        radius={[12, 12, 0, 0]}
                        barSize={barSize}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
          </BarChart>
          </ResponsiveContainer>
          )}
      </motion.div>
    </motion.div>
  );
};

export default RevenueChart;
