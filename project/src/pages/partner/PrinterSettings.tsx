import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, CreditCard as Edit3, Save, Info, Wifi, WifiOff, Monitor, Palette, FileText, Check, X, RefreshCw } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';
import axios from 'axios';
import { API_BASE } from '../../lib/api';
 
// Resolve canonical shop id from query/localStorage (match logic used elsewhere)
const resolveShopId = (): string => {
  try {
    const url = new URL(window.location.href);
    const qs = url.searchParams.get('shop_id') || url.searchParams.get('shopId') || undefined;
    const stored = window.localStorage.getItem('shop_id') || window.localStorage.getItem('shopId') || undefined;
    const HEX24 = /^[a-fA-F0-9]{24}$/;
    // Prefer query param if it's a canonical shop id (not a 24-char hex ObjectId)
    const sid = (qs && !HEX24.test(qs)) ? qs : (stored && !HEX24.test(stored) ? stored : '');
    // Persist query param into localStorage if valid
    if (qs && !HEX24.test(qs)) {
      try { window.localStorage.setItem('shop_id', qs); } catch (e) { /* ignore */ }
    }
    // Clean up stored ObjectId values if any
    if (stored && HEX24.test(stored)) {
      try { window.localStorage.removeItem('shopId'); } catch (e) {}
      try { window.localStorage.removeItem('shop_id'); } catch (e) {}
    }
    return sid || '';
  } catch {
    return '';
  }
};

const PrinterSettings = () => {

// Helper: normalize capabilities from array[0] or object; IMPORTANT: leave fields undefined when absent
// so agent-detected values can win in the final merge.
const normalizeCapabilities = (capAny: any) => {
  let cap: any = {};
  if (Array.isArray(capAny)) {
    cap = capAny.length ? capAny[0] : {};
  } else if (capAny && typeof capAny === 'object') {
    cap = capAny;
  }
  const hasType = typeof (cap as any).type !== 'undefined' || typeof (cap as any).Type !== 'undefined';
  const rawType = hasType ? ((cap as any).type || (cap as any).Type) : undefined;
  const type = typeof rawType === 'string' && rawType.length > 0 ? String(rawType) : undefined;
  const hasDuplex = Object.prototype.hasOwnProperty.call(cap, 'duplex');
  const duplex = hasDuplex ? !!(cap as any).duplex : undefined;
  const paperSizes = Array.isArray((cap as any).paperSizes) ? (cap as any).paperSizes.map((s: any) => String(s)) : [];
  return { type, duplex, paperSizes };
};

  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [shopId, setShopId] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterType | null>(null);
  const [editForm, setEditForm] = useState<EditFormType>({
    name: '',
    type: '',
    capabilities: {
      type: '',
      duplex: false,
      paperSizes: []
    },
    notes: ''
  });
  // Track which fields were changed by the user in the modal (partial updates)
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [originalFinalValues, setOriginalFinalValues] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  // Lightweight toast for save feedback
  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null);
  const showToast = (type: 'success'|'error'|'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2200);
  };

  type PrinterType = any; // Using backend shape directly

  // Using backend shapes directly

  type EditFormType = {
    name: string;
    type: string;
    capabilities: {
      type: string;
      duplex: boolean;
      paperSizes: string[];
    };
    notes: string;
  };

  useEffect(() => {
    // initialize shop id from query/localStorage (persist canonical shop_id)
    const sid = resolveShopId();
    if (sid) setShopId(sid);
  }, []);

  // Fetch printers whenever shopId is available
  useEffect(() => {
    if (!shopId) return;
    let mounted = true;
    const normalize = (p: any) => {
      const manualStatus = (p.manualStatus || p.manual_status || 'on');
      const status = (p.status || p.agentDetected?.status || (p.agentDetected && p.agentDetected.status) || 'offline');
      return {
        ...p,
        printerid: p.printerid || p.printerId || null,
        manualStatus,
        status,
        isEnabled: manualStatus === 'on'
      };
    };

    

    const fetchPrinters = async () => {
      try {
        let response = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers`);
        const body: any = response.data || [];
        const raw = Array.isArray(body) ? body : (Array.isArray(body.printers) ? body.printers : []);
        console.debug('[Printers] fetched', raw);
        const normalized = raw.map(normalize);
        if (!mounted) return;
        setPrinters(normalized);
      } catch (error) {
        // If the shop identifier was invalid (404), try resolving from stored Mongo _id (fallback)
        console.error('Error fetching printers:', error);
        try {
          const errStatus = (error as any)?.response?.status;
          if (errStatus === 404) {
            const storedObj = typeof window !== 'undefined' ? window.localStorage.getItem('shop_object_id') : null;
            const HEX24 = /^[a-fA-F0-9]{24}$/;
            if (storedObj && HEX24.test(storedObj)) {
              // Try to resolve canonical shop id from _id
              try {
                const r2 = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(storedObj)}`);
                if (r2 && r2.data) {
                  const shop2 = r2.data;
                  const cid = shop2.shop_id || shop2.shopId || '';
                  if (cid && !HEX24.test(cid)) {
                    try { window.localStorage.setItem('shop_id', cid); } catch (e) {}
                    try { window.localStorage.removeItem('shopId'); } catch (e) {}
                    // update local state and reattempt printers fetch once
                    setShopId(cid);
                    const retry = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(cid)}/printers`);
                    const body2: any = retry.data || [];
                    const raw2 = Array.isArray(body2) ? body2 : (Array.isArray(body2.printers) ? body2.printers : []);
                    const normalized2 = raw2.map(normalize);
                    if (!mounted) return;
                    setPrinters(normalized2);
                    return;
                  }
                }
              } catch (e) {
                // ignore fallback failures
              }
            }
          }
        } catch (e) {
          // swallow
        }
      }
    };

    fetchPrinters();
    const interval = setInterval(fetchPrinters, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, [shopId]);

  // Helper: resolve final values for display (manualOverride takes precedence per-field)
    const getFinalPrinterValues = (p: any) => {
      const agentCap = normalizeCapabilities(p?.agentDetected?.capabilities);
      const manualCap = normalizeCapabilities(p?.manualOverride?.capabilities);

      // Normalize type: treat any string containing 'color' as Color, else B/W
      const rawType = manualCap.type || agentCap.type || 'B/W';
      const finalType = /color/i.test(String(rawType)) ? 'Color' : 'B/W';

      // Duplex coercion
      const finalDuplex = (typeof manualCap.duplex !== 'undefined' && manualCap.duplex !== null) ? !!manualCap.duplex : !!agentCap.duplex;

      // Paper sizes - prefer manual override if present and non-empty
      const finalPaperSizes = (Array.isArray(manualCap.paperSizes) && manualCap.paperSizes.length)
        ? manualCap.paperSizes
        : (Array.isArray(agentCap.paperSizes) ? agentCap.paperSizes : []);

      const finalName = (p?.manualOverride && p.manualOverride.name) || p?.agentDetected?.name || p?.printerid;
      const badgeStatus = p?.manualStatus === 'on' ? 'online' : (p?.manualStatus === 'pending_off' ? 'pending_off' : 'offline');

      return {
        name: finalName,
        type: finalType,
        duplex: finalDuplex,
        paperSizes: finalPaperSizes,
        badgeStatus,
        cardStatus: p?.status === 'online' ? 'online' : 'offline',
        isEnabled: p?.manualStatus === 'on',
      };
    };

  // Paper sizes list for dropdown (fetched from API; fallback to union of printers' sizes)
  const [allPaperSizes, setAllPaperSizes] = useState<string[]>([]);
  useEffect(() => {
    if (!shopId) return;
    let mounted = true;
    const load = async () => {
      try {
        const r = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/paper-sizes`);
        const sizes = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.sizes) ? r.data.sizes : []);
        const DEFAULTS = ['A3','Letter'];
        const merged = Array.from(new Set([...(sizes || []), ...DEFAULTS]));
        if (mounted) setAllPaperSizes(merged);
        if (sizes.length) return; // success
      } catch (e) {}
      // Fallback to union of current printers
      const union = Array.from(new Set(printers.flatMap((p: any) => [
        ...(p.agentDetected?.capabilities?.[0]?.paperSizes || []),
        ...(p.manualOverride?.capabilities?.[0]?.paperSizes || [])
      ])));
      const DEFAULTS = ['A3','Letter'];
      const merged = Array.from(new Set([...(union || []), ...DEFAULTS]));
      if (mounted) setAllPaperSizes(merged);
    };
    load();
    const t = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, [shopId, printers]);

  // debug mode (enable by adding ?debug=true to the URL)
  const debugMode = typeof window !== 'undefined' && (new URL(window.location.href)).searchParams.get('debug') === 'true';

  // Toggle manualStatus on/off for a specific printer (card & modal)
  const toggleManualStatus = async (printer: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!printer) return;
    const current = printer.manualStatus || (printer.isEnabled ? 'on' : 'off');
    const newStatus = current === 'on' ? 'off' : 'on';
    // Optimistic UI update
    setPrinters(prev => prev.map(p => (p.printerid === printer.printerid ? { ...p, manualStatus: newStatus, isEnabled: newStatus === 'on' } : p)));
    if (selectedPrinter?.printerid === printer.printerid) {
      setSelectedPrinter((prev: any) => prev ? { ...prev, manualStatus: newStatus, isEnabled: newStatus === 'on' } : prev);
    }
    try {
      const pid = encodeURIComponent(printer.printerid || printer.printerId);
      if (!shopId) return;
  // send manualStatus update
  await axios.patch(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers/${pid}/manualStatus`, { manualStatus: newStatus });
      // Refresh printers to reflect backend authoritative state (may return pending_off)
      const response = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers`);
      const body: any = response.data || [];
      const arr = Array.isArray(body) ? body : (Array.isArray(body.printers) ? body.printers : []);
      const normalized = arr.map((p: any) => ({
        ...p,
        printerid: p.printerid || p.printerId || null,
        manualStatus: (p.manualStatus || p.manual_status || 'on'),
        status: (p.status || p.agentDetected?.status || 'offline'),
        isEnabled: (p.manualStatus || p.manual_status || 'on') === 'on'
      }));
      setPrinters(normalized);
    } catch (err) {
      console.error('Failed to toggle manualStatus', err);
      // Revert on error
      setPrinters(prev => prev.map(p => (p.printerid === printer.printerid ? { ...p, manualStatus: current, isEnabled: current === 'on' } : p)));
      if (selectedPrinter?.printerid === printer.printerid) {
        setSelectedPrinter((prev: any) => prev ? { ...prev, manualStatus: current, isEnabled: current === 'on' } : prev);
      }
    }
  };

  const openPrinterModal = (printer: PrinterType) => {
    setSelectedPrinter(printer);
    setIsEditing(false);
    // Initialize manual side with manual overrides if present; otherwise copy agent-detected values
    const agentCap = normalizeCapabilities(printer?.agentDetected?.capabilities);
    const manualCap = normalizeCapabilities(printer?.manualOverride?.capabilities);
    const hasManualType = !!manualCap.type;
    const hasManualDuplex = typeof printer?.manualOverride?.capabilities?.[0]?.duplex !== 'undefined';
    const hasManualSizes = Array.isArray(manualCap.paperSizes) && manualCap.paperSizes.length > 0;
    const startName = (printer?.manualOverride?.name) || (printer?.agentDetected?.name) || (printer as any)?.printerid || '';
    const startTypeStr = hasManualType ? manualCap.type : (agentCap.type || 'B/W');
    const startTypeToken = /color/i.test(String(startTypeStr)) ? 'color' : 'bw';
    const startDuplex = hasManualDuplex ? !!manualCap.duplex : !!agentCap.duplex;
    const startSizes = hasManualSizes ? manualCap.paperSizes : (agentCap.paperSizes || []);

    const final = getFinalPrinterValues(printer);
    setOriginalFinalValues(final);
    setEditForm({
      name: startName,
      type: startTypeToken,
      capabilities: {
        type: startTypeToken,
        duplex: startDuplex,
        paperSizes: startSizes
      },
      notes: printer?.manualOverride?.notes || ''
    });
    setChangedFields(new Set());
  };

  const startEdit = () => {
    setIsEditing(true);
  };

  const saveManualOverride = async () => {
    if (!selectedPrinter) return;
    try {
      if (!shopId) return;
      const pid = encodeURIComponent(selectedPrinter.printerid || selectedPrinter.printerId);
      // Build partial manualOverride payload with only changed fields
      const payload: any = { manualOverride: {} };
      // Name
      if ((changedFields && changedFields.has('name')) || (originalFinalValues && originalFinalValues.name !== editForm.name)) {
        payload.manualOverride.name = editForm.name;
      }
      // Notes
      if (changedFields && changedFields.has('notes')) {
        payload.manualOverride.notes = editForm.notes || '';
      }
      // Capabilities
      const capObj: any = {};
      // Type: map token to canonical
      if (changedFields && changedFields.has('type')) {
        capObj.type = editForm.capabilities.type === 'color' ? 'Color' : 'B/W';
      }
      if (changedFields && changedFields.has('duplex')) {
        capObj.duplex = !!editForm.capabilities.duplex;
      }
      if (changedFields && changedFields.has('paperSizes')) {
        capObj.paperSizes = editForm.capabilities.paperSizes || [];
      }
      if (Object.keys(capObj).length > 0) {
        payload.manualOverride.capabilities = [capObj];
      }
      // If no fields changed, keep modal open and inform user
      if (!payload.manualOverride.name && !payload.manualOverride.capabilities && typeof payload.manualOverride.notes === 'undefined') {
        showToast('info', 'No changes to save');
        return;
      }

  await axios.patch(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers/${pid}`, payload);
      setIsEditing(false);
      showToast('success', 'Overrides updated');
      // Refresh printers list to reflect authoritative backend values
      const response = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers`);
      const body: any = response.data || [];
      const arr = Array.isArray(body) ? body : (Array.isArray(body.printers) ? body.printers : []);
      const normalized = arr.map((p: any) => ({
        ...p,
        printerid: p.printerid || p.printerId || null,
        manualStatus: p.manualStatus || p.manual_status || 'on',
        status: p.status || p.agentDetected?.status || 'offline',
        isEnabled: (p.manualStatus || p.manual_status || 'on') === 'on'
      }));
      setPrinters(normalized);
    } catch (error) {
      console.error('Error updating manual override:', error);
      showToast('error', 'Failed to save overrides');
    }
  };

  // refresh handled inline where needed

  // Helper to format timestamps nicely
  const formatTime = (timestamp?: string | Date) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Precompute agent section values for modal to avoid JSX IIFE and ensure a single parent node
  // Agent panel must strictly show agent-detected data (do not fall back to manual when empty)
  const modalCapRaw = selectedPrinter?.agentDetected?.capabilities || [];
  const modalCapNorm = normalizeCapabilities(modalCapRaw);
  const modalColorMode = modalCapNorm?.type === 'Color+B/W'
    ? 'color+bw'
    : (modalCapNorm?.type === 'Color' ? 'color' : 'bw');
  const modalDuplex = !!modalCapNorm?.duplex;
  const modalPaperSizes: string[] = modalCapNorm?.paperSizes || [];
  const agentNameModal = selectedPrinter?.agentDetected?.name
    || selectedPrinter?.manualOverride?.name
    || selectedPrinter?.printerid;

  return (
    <>
    <PartnerLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Printer Settings</h1>
          <p className="text-lg text-gray-600">Manage your connected printers</p>
        </motion.div>

        {/* Printer Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-center w-full"
        >
          <div className="flex flex-col items-center w-full space-y-6 pb-4">
            {printers.map(printer => {
                // Resolve final values per-field (manualOverride takes precedence)
                const final = getFinalPrinterValues(printer);
                const displayName = final.name || printer.printerid || 'Printer';
                const colorMode = (final.type === 'Color') ? 'color' : 'bw';
                const capabilities = {
                  colorSupport: final.type === 'Color',
                  colorMode,
                  duplexSupport: !!final.duplex,
                  paperSizes: final.paperSizes || [],
                  maxCopies: 0,
                };
              // Use capabilities.duplexSupport, capabilities.paperSizes, etc. with safe checks
              return (
                <motion.div
              key={printer.printerid || printer.agentDetected?.name || displayName}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="w-full flex justify-center"
                  onClick={() => openPrinterModal(printer)}
                >
                  <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:bg-white/80 max-w-4xl w-[90%] mx-auto cursor-pointer">
                    {/* Header with Status and Toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl">
                          <Printer className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{displayName}</h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Small badge: reflect manualStatus (on/off/pending_off) */}
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          printer.manualStatus === 'on' ? 'bg-green-100 text-green-800' : (printer.manualStatus === 'pending_off' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800')
                        }`}>
                          {printer.manualStatus === 'on' ? (
                            <Wifi className="h-3 w-3 mr-1" />
                          ) : (printer.manualStatus === 'pending_off' ? (
                            <WifiOff className="h-3 w-3 mr-1" />
                          ) : (
                            <WifiOff className="h-3 w-3 mr-1" />
                          ))}
                          {printer.manualStatus === 'on' ? 'Connected' : (printer.manualStatus === 'pending_off' ? 'Pending Off' : 'Offline')}
                        </div>
                        {/* On/Off Toggle Switch */}
                        <div 
                          onClick={(e) => {
                            // Allow turning a printer back ON even when it's pending_off.
                            // Only block attempts to turn it OFF while pending.
                            const current = printer.manualStatus || (printer.isEnabled ? 'on' : 'off');
                            const newStatus = current === 'on' ? 'off' : 'on';
                            if (printer.manualStatus === 'pending_off' && newStatus === 'off') return;
                            toggleManualStatus(printer, e);
                          }}
                          className="relative inline-flex items-center cursor-pointer"
                          title={printer.isEnabled ? 'Disable Printer' : 'Enable Printer'}
                        >
                          <input 
                            type="checkbox" 
                            checked={printer.isEnabled} 
                            readOnly
                            className="sr-only peer" 
                          />
                          <div className={`w-11 h-6 ${printer.manualStatus === 'pending_off' ? 'bg-orange-400' : (printer.isEnabled ? 'bg-green-600' : 'bg-red-500')} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 
                            rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                            after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all shadow-inner transition-colors duration-200`}>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Capability Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        capabilities.colorSupport 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {capabilities.colorSupport ? (
                          <Palette className="h-3 w-3 mr-1" />
                        ) : (
                          <Monitor className="h-3 w-3 mr-1" />
                        )}
                        {capabilities.colorSupport ? 'Color' : 'B/W'}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        capabilities.duplexSupport 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <FileText className="h-3 w-3 mr-1" />
                        {capabilities.duplexSupport ? 'Double Side' : 'Single-side'}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {(capabilities.paperSizes || []).join(', ')}
                      </span>
                    </div>
                    {/* Printer Status Indicator */}
                    <div className="mb-4">
                      {/* Big status bar: reflect agent status only (online/offline) */}
                      <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                        printer.status === 'online' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${printer.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-sm font-medium ${printer.status === 'online' ? 'text-green-700' : 'text-red-700'}`}>
                          {printer.status === 'online' ? 'Active & Ready' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50/50 rounded-lg backdrop-blur-sm">
                      <div>Last Update: {formatTime(printer.lastUpdate)}</div>
                    </div>
                    {debugMode && (
                      <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-800">
                        <div className="font-medium text-sm mb-1">Debug — raw vs final</div>
                        <pre className="whitespace-pre-wrap text-xs max-h-40 overflow-auto">{JSON.stringify({ raw: printer, final }, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Modal Overlay */}
        {selectedPrinter && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30"></div>
            <div className="fixed inset-0 z-50">
              <div className="flex justify-center items-start h-full pl-[15%]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-4xl my-8 mx-auto overflow-y-auto max-h-[90vh] overflow-x-hidden scrollbar-hide"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#94A3B8 #F1F5F9',
                  }}
                >
                  <div className="bg-white rounded-2xl shadow-2xl w-full border border-gray-200/50">
                  {/* Enhanced Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-lg shadow-md">
                        <Printer className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">{selectedPrinter?.manualOverride?.name || selectedPrinter?.agentDetected?.name || selectedPrinter?.printerid}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${selectedPrinter?.status === 'online' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {selectedPrinter?.status === 'online' ? (
                              <><Wifi className="h-3 w-3 mr-1" />Connected</>
                            ) : (
                              <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPrinter(null)}
                      className="text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors duration-200 shadow-sm"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Enhanced Modal Content */}
                                    {/* Modal Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto scrollbar-hide">
                    {/* Manual Override Section - Enhanced */}
                    <div className="p-8 border-r border-gray-100">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">Manual Override</h4>
                          <p className="text-sm text-gray-500">Customize printer settings</p>
                        </div>
                        <button 
                          onClick={startEdit}
                          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="space-y-5">
                                            <div>
                                              <label className="block text-sm font-medium text-gray-700 mb-1.5">Printer Name</label>
                                              <div className="relative">
                                                <input
                                                  type="text"
                                                  value={editForm.name}
                                                  onChange={(e) => {
                                                    setEditForm({ ...editForm, name: e.target.value });
                                                    setChangedFields(prev => new Set(Array.from(prev).concat(['name'])));
                                                  }}
                                                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                                  readOnly={!isEditing}
                                                />
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                  <Printer className="h-5 w-5 text-gray-400" />
                                                </div>
                                              </div>
                                              <p className="text-xs text-blue-600 mt-1.5 flex items-center">
                                                <Info className="h-3 w-3 mr-1" />
                                                Using agent-detected value
                                              </p>
                                            </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Capability Type</label>
                          <div className="relative">
                            <select
                              value={editForm.capabilities.type}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm({ 
                                  ...editForm, 
                                  capabilities: { 
                                    ...editForm.capabilities, 
                                    type: val
                                  } 
                                });
                                setChangedFields(prev => new Set(Array.from(prev).concat(['type'])));
                              }}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                              disabled={!isEditing}
                            >
                              <option value="bw" className="bg-white text-gray-700 py-2 hover:bg-gray-100">B/W</option>
                              <option value="color" className="bg-white text-purple-700 py-2 hover:bg-purple-50">Color</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                            {editForm.capabilities.type === 'color+bw' && (
                              <p className="text-xs text-gray-500 mt-1 ml-1">Allows printing on both sides of paper</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                          <div>
                            <textarea
                              value={editForm.notes}
                              onChange={(e) => {
                                setEditForm({ ...editForm, notes: e.target.value });
                                setChangedFields(prev => new Set(Array.from(prev).concat(['notes'])));
                              }}
                              readOnly={!isEditing}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                              rows={3}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duplex Printing</label>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={editForm.capabilities.duplex}
                                  onChange={(e) => {
                                    setEditForm({ 
                                      ...editForm, 
                                      capabilities: { 
                                        ...editForm.capabilities, 
                                        duplex: e.target.checked 
                                      } 
                                    });
                                    setChangedFields(prev => new Set(Array.from(prev).concat(['duplex'])));
                                  }}
                                  className="opacity-0 absolute h-6 w-6"
                                  disabled={!isEditing}
                                />
                                <div className={`border-2 rounded w-6 h-6 flex flex-shrink-0 justify-center items-center mr-2 ${editForm.capabilities.duplex ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                  {editForm.capabilities.duplex && <Check className="h-4 w-4 text-white" />}
                                </div>
                              </div>
                              <div>
                                <span className="text-sm text-gray-700 font-medium">Supports double-sided printing</span>
                                <p className="text-xs text-gray-500 mt-0.5">Allows printing on both sides of paper</p>
                              </div>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Paper Sizes</label>
                          <div className="relative">
                            <div className="flex items-center mb-2">
                              <div className="relative w-full">
                                <select
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !editForm.capabilities.paperSizes.includes(val)) {
                                      setEditForm({ 
                                        ...editForm, 
                                        capabilities: { 
                                          ...editForm.capabilities, 
                                          paperSizes: [...editForm.capabilities.paperSizes, val]
                                        } 
                                      });
                                      setChangedFields(prev => new Set(Array.from(prev).concat(['paperSizes'])));
                                    }
                                    e.target.value = "";
                                  }}
                                  disabled={!isEditing}
                                >
                                  <option value="" disabled className="text-gray-500">Add paper size...</option>
                                  {allPaperSizes.filter(
                                    size => !editForm.capabilities.paperSizes.includes(size)
                                  ).map(size => (
                                    <option key={size} value={size} className="bg-white text-gray-700 py-1">{size}</option>
                                  ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                            {(editForm.capabilities.paperSizes || []).map((size, i) => (
                          <span key={size} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {size}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditForm({
                                    ...editForm,
                                    capabilities: {
                                      ...editForm.capabilities,
                                      paperSizes: editForm.capabilities.paperSizes.filter((_, index) => index !== i)
                                    }
                                  });
                                  setChangedFields(prev => new Set(Array.from(prev).concat(['paperSizes'])));
                                  }}
                                  className="ml-1.5 h-4 w-4 inline-flex items-center justify-center text-blue-400 hover:text-blue-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Agent Detected Values Section - Enhanced */}
                    <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xl font-bold text-green-800 mb-2">Agent Detected Values</h4>
                          <p className="text-sm text-green-600 mb-6">System automatically detected settings</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`text-sm font-medium ${selectedPrinter?.manualStatus === 'pending_off' ? 'text-orange-700' : (selectedPrinter?.isEnabled ? 'text-green-700' : 'text-red-700')}`}>
                              {selectedPrinter?.manualStatus === 'pending_off' ? 'Pending Off' : (selectedPrinter?.isEnabled ? 'Printer Enabled' : 'Printer Disabled')}
                            </span>
                            <div 
                              onClick={(e) => {
                                // Allow turning a pending_off printer back ON from the modal.
                                const cur = selectedPrinter?.manualStatus || (selectedPrinter?.isEnabled ? 'on' : 'off');
                                const newS = cur === 'on' ? 'off' : 'on';
                                if (selectedPrinter?.manualStatus === 'pending_off' && newS === 'off') return;
                                toggleManualStatus(selectedPrinter, e);
                              }}
                              className="relative inline-flex items-center cursor-pointer"
                            >
                              <input 
                                type="checkbox" 
                                checked={selectedPrinter?.isEnabled || false} 
                                readOnly
                                className="sr-only peer" 
                              />
                              <div className={`w-11 h-6 ${selectedPrinter?.manualStatus === 'pending_off' ? 'bg-orange-400' : (selectedPrinter?.isEnabled ? 'bg-green-500' : 'bg-red-500')} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
                                rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                                peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                                after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                                after:transition-all peer-checked:bg-green-500 shadow-inner transition-colors duration-200`}>
                              </div>
                            </div>
                          </div>
                          {selectedPrinter?.manualStatus === 'pending_off' && (
                            <span className="text-xs text-orange-600">1 job is in queue. Turning off after completion…</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${selectedPrinter?.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {selectedPrinter?.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Printer Name</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <div className="flex items-center">
                              <Printer className="h-4 w-4 text-green-500 mr-2" />
                              <p className="text-green-800 font-medium">{agentNameModal}</p>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 mt-1.5 flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Auto-detected by agent
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Capability Type</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <div className="flex items-center">
                              {modalColorMode === 'color+bw' ? (
                                <Palette className="h-4 w-4 text-indigo-500 mr-2" />
                              ) : (modalColorMode !== 'bw') ? (
                                <Palette className="h-4 w-4 text-purple-500 mr-2" />
                              ) : (
                                <Monitor className="h-4 w-4 text-gray-500 mr-2" />
                              )}
                              <p className="text-green-800 font-medium">
                                {modalColorMode === 'color+bw' ? 'Color+B/W' : (modalColorMode !== 'bw') ? 'Color' : 'B/W'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Duplex</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-500 mr-2" />
                              <p className="text-green-800 font-medium">
                                {modalDuplex ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Paper Sizes</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <p className="text-green-800 font-medium">{modalPaperSizes.join(', ')}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(modalPaperSizes || []).map((size: string) => (
                              <span key={size} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                {size}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Modal Actions */}
                  <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50/90 rounded-b-2xl backdrop-blur-sm sticky bottom-0 z-10 shadow-md">
                    <button
                      onClick={saveManualOverride}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                    >
                      <Save className="h-5 w-5" />
                      <span>Save Override</span>
                    </button>
                    {selectedPrinter && (
                      <button
                        onClick={async () => {
                          try {
                            if (!shopId) return;
                            const pid = encodeURIComponent(selectedPrinter.printerid || selectedPrinter.printerId);
                            await axios.post(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers/${pid}/sync`);
                            const response = await axios.get(`${API_BASE}/api/shops/${encodeURIComponent(shopId)}/printers`);
                            const body: any = response.data || [];
                            const arr = Array.isArray(body) ? body : (Array.isArray(body.printers) ? body.printers : []);
                            const normalized = arr.map((p: any) => ({
                              ...p,
                              printerid: p.printerid || p.printerId || null,
                              manualStatus: p.manualStatus || p.manual_status || 'on',
                              status: p.status || p.agentDetected?.status || 'offline',
                              isEnabled: (p.manualStatus || p.manual_status || 'on') === 'on'
                            }));
                            setPrinters(normalized);
                          } catch (e) {
                            console.error('Forced sync failed', e);
                          }
                        }}
                        className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                      >
                        <RefreshCw className="h-5 w-5" />
                        <span>Force Sync</span>
                      </button>
                    )}
                  </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
    </PartnerLayout>
    {toast && (
      <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        toast?.type === 'success' ? 'bg-green-600 text-white' : toast?.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
      }`}>
        {toast?.message}
      </div>
    )}
  </>
  );
};

export default PrinterSettings;