import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Printer, 
  RefreshCw, 
  Edit3, 
  Save, 
  Info, 
  Wifi, 
  WifiOff,
  Monitor,
  Palette,
  FileText,
  Settings,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const PrinterSettings = () => {
  const [agentPrinters, setAgentPrinters] = useState([
    {
      id: 'agent_1',
      name: 'HP LaserJet Pro M404n',
      type: 'laser',
      status: 'online',
      capabilities: {
        colorSupport: false,
        duplexSupport: true,
        paperSizes: ['A4', 'A3', 'Letter'],
        maxCopies: 999
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '48.4.4623',
        detectedAt: new Date('2025-01-15T10:30:00'),
        ipAddress: '192.168.1.101'
      },
      usingAgentValues: true
    },
    {
      id: 'agent_2',
      name: 'Canon PIXMA G3010',
      type: 'inkjet',
      status: 'online',
      capabilities: {
        colorSupport: true,
        duplexSupport: false,
        paperSizes: ['A4', 'Letter', 'Photo'],
        maxCopies: 99
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '1.02',
        detectedAt: new Date('2025-01-15T09:15:00'),
        ipAddress: '192.168.1.102'
      },
      usingAgentValues: false
    },
    {
      id: 'agent_3',
      name: 'Brother HL-L2350DW',
      type: 'laser',
      status: 'offline',
      capabilities: {
        colorSupport: false,
        duplexSupport: true,
        paperSizes: ['A4', 'Letter'],
        maxCopies: 999
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '1.0.3.0',
        detectedAt: new Date('2025-01-15T08:45:00'),
        ipAddress: '192.168.1.103'
      },
      usingAgentValues: true
    }
  ]);

  const [manualOverrides, setManualOverrides] = useState({
    agent_2: {
      name: 'Color Station Printer',
      type: 'inkjet',
      capabilities: {
        colorSupport: true,
        duplexSupport: true, // Override: agent detected false
        paperSizes: ['A4', 'A3', 'Letter'], // Override: added A3
        maxCopies: 50 // Override: reduced from 99
      },
      notes: 'Duplex works manually, A3 supported with manual feed'
    }
  });

  const [defaultPrinter, setDefaultPrinter] = useState('agent_1');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [syncing, setSyncing] = useState(false);

  const paperSizeOptions = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Photo', 'Custom'];

  const syncPrinters = async () => {
    setSyncing(true);
    // Simulate API call
    setTimeout(() => {
      setLastSyncTime(new Date());
      setSyncing(false);
    }, 2000);
  };

  const toggleAgentValues = (printerId) => {
    setAgentPrinters(printers => 
      printers.map(printer => 
        printer.id === printerId 
          ? { ...printer, usingAgentValues: !printer.usingAgentValues }
          : printer
      )
    );
  };

  const startEdit = (printer) => {
    const override = manualOverrides[printer.id];
    setEditForm({
      name: override?.name || printer.name,
      type: override?.type || printer.type,
      colorSupport: override?.capabilities.colorSupport ?? printer.capabilities.colorSupport,
      duplexSupport: override?.capabilities.duplexSupport ?? printer.capabilities.duplexSupport,
      paperSizes: override?.capabilities.paperSizes || printer.capabilities.paperSizes,
      maxCopies: override?.capabilities.maxCopies || printer.capabilities.maxCopies,
      notes: override?.notes || ''
    });
    setIsEditing(printer.id);
  };

  const saveManualOverride = () => {
    setManualOverrides(prev => ({
      ...prev,
      [isEditing]: {
        name: editForm.name,
        type: editForm.type,
        capabilities: {
          colorSupport: editForm.colorSupport,
          duplexSupport: editForm.duplexSupport,
          paperSizes: editForm.paperSizes,
          maxCopies: editForm.maxCopies
        },
        notes: editForm.notes
      }
    }));
    
    // Mark as not using agent values
    setAgentPrinters(printers => 
      printers.map(printer => 
        printer.id === isEditing 
          ? { ...printer, usingAgentValues: false }
          : printer
      )
    );
    
    setIsEditing(null);
    setEditForm({});
  };

  const removeOverride = (printerId) => {
    const newOverrides = { ...manualOverrides };
    delete newOverrides[printerId];
    setManualOverrides(newOverrides);
    
    // Mark as using agent values
    setAgentPrinters(printers => 
      printers.map(printer => 
        printer.id === printerId 
          ? { ...printer, usingAgentValues: true }
          : printer
      )
    );
  };

  const getDisplayValues = (printer) => {
    const override = manualOverrides[printer.id];
    if (printer.usingAgentValues || !override) {
      return {
        name: printer.name,
        type: printer.type,
        capabilities: printer.capabilities,
        notes: '',
        isOverridden: false
      };
    }
    return {
      name: override.name,
      type: override.type,
      capabilities: override.capabilities,
      notes: override.notes,
      isOverridden: true
    };
  };

  const formatTime = (date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <PartnerLayout>
      <div className="space-y-8">
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

        {/* Section 1: Agent Detected Printers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Agent Detected Printers</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Automatically detected from your system</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agentPrinters.map((printer) => {
              const displayValues = getDisplayValues(printer);
              
              return (
                <motion.div
                  key={printer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="relative group"
                >
                  {/* Glassmorphism Card */}
                  <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:bg-white/80">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        printer.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {printer.status === 'online' ? (
                          <Wifi className="h-3 w-3 mr-1" />
                        ) : (
                          <WifiOff className="h-3 w-3 mr-1" />
                        )}
                        {printer.status}
                      </div>
                      
                      {displayValues.isOverridden && (
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          Manual Override
                        </div>
                      )}
                    </div>

                    {/* Printer Info */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-xl">
                          <Printer className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{displayValues.name}</h3>
                          {displayValues.isOverridden && (
                            <p className="text-sm text-gray-500">Agent: {printer.name}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <div className="flex items-center space-x-2">
                          {displayValues.capabilities.colorSupport ? (
                            <Palette className="h-4 w-4 text-purple-500" />
                          ) : (
                            <Monitor className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {displayValues.capabilities.colorSupport ? 'Color' : 'B&W'} {displayValues.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Duplex:</span>
                        <span className={`text-sm font-medium ${
                          displayValues.capabilities.duplexSupport ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {displayValues.capabilities.duplexSupport ? 'Yes' : 'No'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Paper:</span>
                        <span className="text-sm font-medium">
                          {displayValues.capabilities.paperSizes.join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Max Copies:</span>
                        <span className="text-sm font-medium">{displayValues.capabilities.maxCopies}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {displayValues.notes && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-700">{displayValues.notes}</p>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div>OS: {printer.metadata.os}</div>
                      <div>Driver: v{printer.metadata.driverVersion}</div>
                      <div>IP: {printer.metadata.ipAddress}</div>
                      <div>Detected: {formatTime(printer.metadata.detectedAt)}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAgentValues(printer.id)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          printer.usingAgentValues
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {printer.usingAgentValues ? (
                          <div className="flex items-center justify-center space-x-1">
                            <Check className="h-4 w-4" />
                            <span>Using Agent</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <Settings className="h-4 w-4" />
                            <span>Manual Override</span>
                          </div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => startEdit(printer)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Section 2: Manual Override Modal */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Manual Override</h3>
                <button
                  onClick={() => setIsEditing(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Printer Name</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  >
                    <option value="laser">Laser</option>
                    <option value="inkjet">Inkjet</option>
                    <option value="dot-matrix">Dot Matrix</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={editForm.colorSupport || false}
                        onChange={(e) => setEditForm({ ...editForm, colorSupport: e.target.checked })}
                        className="rounded text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Color Support</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={editForm.duplexSupport || false}
                        onChange={(e) => setEditForm({ ...editForm, duplexSupport: e.target.checked })}
                        className="rounded text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Duplex Support</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paper Sizes</label>
                  <div className="grid grid-cols-3 gap-2">
                    {paperSizeOptions.map((size) => (
                      <label key={size} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={(editForm.paperSizes || []).includes(size)}
                          onChange={(e) => {
                            const currentSizes = editForm.paperSizes || [];
                            if (e.target.checked) {
                              setEditForm({ ...editForm, paperSizes: [...currentSizes, size] });
                            } else {
                              setEditForm({ ...editForm, paperSizes: currentSizes.filter(s => s !== size) });
                            }
                          }}
                          className="rounded text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Copies</label>
                  <input
                    type="number"
                    value={editForm.maxCopies || ''}
                    onChange={(e) => setEditForm({ ...editForm, maxCopies: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                    placeholder="Add any notes about manual overrides..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button
                  onClick={() => setIsEditing(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveManualOverride}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Save className="h-5 w-5" />
                    <span>Save Override</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Section 3: Sync & Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sync & Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sync Button */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Printer Detection</label>
              <button
                onClick={syncPrinters}
                disabled={syncing}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Printers'}</span>
              </button>
            </div>

            {/* Default Printer */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Default Printer</label>
              <select
                value={defaultPrinter}
                onChange={(e) => setDefaultPrinter(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
              >
                {agentPrinters.map((printer) => {
                  const displayValues = getDisplayValues(printer);
                  return (
                    <option key={printer.id} value={printer.id}>
                      {displayValues.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Last Sync Time */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Last Synced</label>
              <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">{formatTime(lastSyncTime)}</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Agent Values vs Manual Override</p>
                <p>Agent values are automatically detected from your system. Manual overrides allow you to customize settings when the agent detection isn't accurate for your specific setup.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default PrinterSettings;