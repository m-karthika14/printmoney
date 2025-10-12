import { useState } from 'react';
import { motion } from 'framer-motion';
import { Printer, CreditCard as Edit3, Save, Info, Wifi, WifiOff, Monitor, Palette, FileText, Check, X } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const PrinterSettings = () => {
  const [agentPrinters, setAgentPrinters] = useState<PrinterType[]>([
    {
      id: 'agent_1',
      name: 'HP LaserJet Pro',
      model: 'M404dn',
      type: 'laser',
      status: 'online',
      isEnabled: true,
      capabilities: {
        colorSupport: false,
        colorMode: 'bw',
        duplexSupport: true,
        paperSizes: ['A4', 'Letter'],
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
      model: 'G3010',
      type: 'inkjet',
      status: 'online',
      isEnabled: false,
      capabilities: {
        colorSupport: true,
        colorMode: 'color+bw',
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
      model: 'HL-L2350DW',
      type: 'laser',
      status: 'offline',
      isEnabled: true,
      capabilities: {
        colorSupport: false,
        colorMode: 'bw',
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
    },
    {
      id: 'agent_4',
      name: 'Epson EcoTank L3150',
      model: 'L3150',
      type: 'inkjet',
      status: 'online',
      isEnabled: true,
      capabilities: {
        colorSupport: true,
        colorMode: 'color',
        duplexSupport: false,
        paperSizes: ['A4', 'Letter', 'Photo'],
        maxCopies: 99
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '2.65',
        detectedAt: new Date('2025-01-15T11:20:00'),
        ipAddress: '192.168.1.104'
      },
      usingAgentValues: true
    },
    {
      id: 'agent_5',
      name: 'Samsung ML-2161',
      model: 'ML-2161',
      type: 'laser',
      status: 'online',
      isEnabled: false,
      capabilities: {
        colorSupport: false,
        colorMode: 'bw',
        duplexSupport: false,
        paperSizes: ['A4', 'Letter'],
        maxCopies: 999
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '3.00.90',
        detectedAt: new Date('2025-01-15T08:10:00'),
        ipAddress: '192.168.1.105'
      },
      usingAgentValues: true
    },
    {
      id: 'agent_6',
      name: 'HP DeskJet 2720',
      model: '2720',
      type: 'inkjet',
      status: 'offline',
      isEnabled: true,
      capabilities: {
        colorSupport: true,
        colorMode: 'color+bw',
        duplexSupport: false,
        paperSizes: ['A4', 'Letter', 'Photo'],
        maxCopies: 50
      },
      metadata: {
        os: 'Windows 10',
        driverVersion: '48.3.4590',
        detectedAt: new Date('2025-01-15T07:45:00'),
        ipAddress: '192.168.1.106'
      },
      usingAgentValues: true
    }
  ]);

  type PrinterType = {
    id: string;
    name: string;
    model: string;
    type: string;
    status: 'online' | 'offline';
    isEnabled: boolean;
    capabilities: {
      colorSupport: boolean;
      colorMode?: 'bw' | 'color' | 'color+bw';
      duplexSupport: boolean;
      paperSizes: string[];
      maxCopies: number;
    };
    metadata: {
      os: string;
      driverVersion: string;
      detectedAt: Date;
      ipAddress: string;
    };
    usingAgentValues: boolean;
  };

  type ManualOverrideType = {
    name: string;
    model: string;
    type: string;
    capabilities: {
      colorSupport: boolean;
      colorMode?: 'bw' | 'color' | 'color+bw';
      duplexSupport: boolean;
      paperSizes: string[];
      maxCopies: number;
    };
    notes: string;
  };

  type ManualOverridesState = {
    [key: string]: ManualOverrideType;
  };

  type EditFormType = {
    name: string;
    model: string;
    type: string;
    colorSupport: boolean;
    colorMode: 'bw' | 'color' | 'color+bw';
    duplexSupport: boolean;
    paperSizes: string[];
    maxCopies: number;
    notes: string;
  };

  const [manualOverrides, setManualOverrides] = useState<ManualOverridesState>({
    agent_2: {
      name: 'Color Station Printer',
      model: 'G3010',
      type: 'inkjet',
      capabilities: {
        colorSupport: true,
        colorMode: 'color+bw',
        duplexSupport: true, // Override: agent detected false
        paperSizes: ['A4', 'A3', 'Letter'], // Override: added A3
        maxCopies: 50 // Override: reduced from 99
      },
      notes: 'Duplex works manually, A3 supported with manual feed'
    }
  });

  const [selectedPrinter, setSelectedPrinter] = useState<PrinterType | null>(null);
  const [editForm, setEditForm] = useState<EditFormType>({
    name: '',
    model: '',
    type: '',
    colorSupport: false,
    colorMode: 'bw',
    duplexSupport: false,
    paperSizes: [],
    maxCopies: 0,
    notes: ''
  });

  const openPrinterModal = (printer: PrinterType) => {
    const override = manualOverrides[printer.id] as ManualOverrideType | undefined;
    const colorSupport = override?.capabilities?.colorSupport ?? printer.capabilities.colorSupport;
    const colorMode = override?.capabilities?.colorMode || (colorSupport ? 'color' : 'bw');
    
    setEditForm({
      name: override?.name || printer.name,
      model: override?.model || printer.model,
      type: override?.type || printer.type,
      colorSupport,
      colorMode,
      duplexSupport: override?.capabilities?.duplexSupport ?? printer.capabilities.duplexSupport,
      paperSizes: override?.capabilities?.paperSizes || printer.capabilities.paperSizes,
      maxCopies: override?.capabilities?.maxCopies || printer.capabilities.maxCopies,
      notes: override?.notes || ''
    });
    setSelectedPrinter(printer);
  };

  const saveManualOverride = () => {
    if (!selectedPrinter) return;
    setManualOverrides(prev => ({
      ...prev,
      [selectedPrinter.id]: {
        name: editForm.name,
        model: editForm.model,
        type: editForm.type,
        capabilities: {
          colorSupport: editForm.colorSupport,
          colorMode: editForm.colorMode,
          duplexSupport: editForm.duplexSupport,
          paperSizes: editForm.paperSizes,
          maxCopies: editForm.maxCopies
        },
        notes: editForm.notes
      }
    }));
  };

  const useAgentValues = (printerId: string) => {
    const newOverrides = { ...manualOverrides } as ManualOverridesState;
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

  const togglePrinter = (printerId: string) => {
    setAgentPrinters(printers =>
      printers.map(printer =>
        printer.id === printerId
          ? { ...printer, isEnabled: !printer.isEnabled }
          : printer
      )
    );
  };

  const getDisplayValues = (printer: PrinterType) => {
    const override = manualOverrides[printer.id] as ManualOverrideType | undefined;
    if (printer.usingAgentValues || !override) {
      // For printers without overrides, set colorMode based on colorSupport
      const capabilities = {
        ...printer.capabilities,
        colorMode: printer.capabilities.colorMode || (printer.capabilities.colorSupport ? 'color' : 'bw')
      };
      
      return {
        name: printer.name,
        model: printer.model,
        type: printer.type,
        capabilities,
        notes: '',
        isOverridden: false
      };
    }
    
    // For overridden printers, ensure colorMode is set
    const capabilities = {
      ...override.capabilities,
      colorMode: override.capabilities.colorMode || (override.capabilities.colorSupport ? 'color' : 'bw')
    };
    
    return {
      name: override.name,
      model: override.model,
      type: override.type,
      capabilities,
      notes: override.notes,
      isOverridden: true
    };
  };

  // Format date to a readable string
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
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
            {agentPrinters.map((printer) => {
              const displayValues = getDisplayValues(printer);
              return (
                <motion.div
                  key={printer.id}
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
                          <h3 className="font-bold text-gray-900 text-lg">{displayValues.name}</h3>
                          <p className="text-sm text-gray-600">{displayValues.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
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
                          {printer.status === 'online' ? 'Connected' : 'Offline'}
                        </div>
                        {/* On/Off Toggle Switch */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePrinter(printer.id);
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
                          <div className={`w-11 h-6 bg-red-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 
                            rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                            after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                            after:transition-all peer-checked:bg-green-600 shadow-inner transition-colors duration-200`}>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Capability Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        displayValues.capabilities.colorMode === 'color+bw' 
                          ? 'bg-indigo-100 text-indigo-800'
                          : displayValues.capabilities.colorSupport 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {displayValues.capabilities.colorMode === 'color+bw' ? (
                          <Palette className="h-3 w-3 mr-1" />
                        ) : displayValues.capabilities.colorSupport ? (
                          <Palette className="h-3 w-3 mr-1" />
                        ) : (
                          <Monitor className="h-3 w-3 mr-1" />
                        )}
                        {displayValues.capabilities.colorMode === 'color+bw' ? 'Color+B/W' : displayValues.capabilities.colorSupport ? 'Color' : 'B/W'}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        displayValues.capabilities.duplexSupport 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <FileText className="h-3 w-3 mr-1" />
                        {displayValues.capabilities.duplexSupport ? 'Duplex' : 'Single-side'}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {displayValues.capabilities.paperSizes.join(', ')}
                      </span>
                    </div>
                    {/* Printer Status Indicator */}
                    <div className="mb-4">
                      <div className={`flex items-center space-x-2 p-2 rounded-lg ${
                        printer.isEnabled 
                          ? printer.status === 'online'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                          : 'bg-red-50/50 border border-red-200'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          printer.isEnabled 
                            ? printer.status === 'online'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                            : 'bg-red-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          printer.isEnabled 
                            ? printer.status === 'online'
                              ? 'text-green-700'
                              : 'text-red-700'
                            : 'text-red-600'
                        }`}>
                          {!printer.isEnabled 
                            ? 'Disabled' 
                            : printer.status === 'online' 
                              ? 'Active & Ready' 
                              : 'Offline'
                          }
                        </span>
                      </div>
                    </div>
                    {/* Metadata */}
                    <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50/50 rounded-lg backdrop-blur-sm">
                      <div>Detected: {formatTime(printer.metadata.detectedAt)}</div>
                    </div>
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
                        <h3 className="text-2xl font-bold text-gray-800">{selectedPrinter?.name}</h3>
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            {selectedPrinter?.model}
                          </span>
                          
                          {/* Enable/Disable Toggle in Modal */}
                          <div className="ml-2 flex items-center space-x-2">
                            <span className={`text-xs ${selectedPrinter?.isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedPrinter?.isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                selectedPrinter && togglePrinter(selectedPrinter.id);
                              }}
                              className="relative inline-flex items-center cursor-pointer"
                            >
                              <input 
                                type="checkbox" 
                                checked={selectedPrinter?.isEnabled || false} 
                                readOnly
                                className="sr-only peer" 
                              />
                              <div className={`w-9 h-5 bg-red-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
                                rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                                peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                                after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 
                                after:transition-all peer-checked:bg-green-500 shadow-inner transition-colors duration-200`}>
                              </div>
                            </div>
                          </div>
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
                        <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg">
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
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
                          <input
                            type="text"
                            value={editForm.model}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                          />
                          <p className="text-xs text-blue-600 mt-1.5 flex items-center">
                            <Info className="h-3 w-3 mr-1" />
                            Using agent-detected value
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Capability Type</label>
                          <div className="relative">
                            <select
                              value={editForm.colorMode}
                              onChange={(e) => setEditForm({ ...editForm, colorMode: e.target.value as 'bw' | 'color' | 'color+bw', colorSupport: e.target.value !== 'bw' })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm appearance-none"
                            >
                              <option value="bw" className="bg-white text-gray-700 py-2 hover:bg-gray-100">B/W</option>
                              <option value="color" className="bg-white text-purple-700 py-2 hover:bg-purple-50">Color</option>
                              <option value="color+bw" className="bg-white text-blue-700 py-2 hover:bg-blue-500 hover:text-white">Color+B/W</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </div>
                            {editForm.colorMode === 'color+bw' && (
                              <p className="text-xs text-gray-500 mt-1 ml-1">Allows printing on both sides of paper</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Duplex Printing</label>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={editForm.duplexSupport}
                                  onChange={(e) => setEditForm({ ...editForm, duplexSupport: e.target.checked })}
                                  className="opacity-0 absolute h-6 w-6"
                                />
                                <div className={`border-2 rounded w-6 h-6 flex flex-shrink-0 justify-center items-center mr-2 ${editForm.duplexSupport ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                  {editForm.duplexSupport && <Check className="h-4 w-4 text-white" />}
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
                                    if (e.target.value && !editForm.paperSizes.includes(e.target.value)) {
                                      setEditForm({ 
                                        ...editForm, 
                                        paperSizes: [...editForm.paperSizes, e.target.value]
                                      });
                                    }
                                    e.target.value = "";
                                  }}
                                >
                                  <option value="" disabled className="text-gray-500">Add paper size...</option>
                                  {['A4', 'A3', 'A5', 'Letter', 'Legal', 'Photo', 'Custom'].filter(
                                    size => !editForm.paperSizes.includes(size)
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
                            {editForm.paperSizes.map((size, i) => (
                              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {size}
                                <button
                                  type="button"
                                  onClick={() => setEditForm({
                                    ...editForm,
                                    paperSizes: editForm.paperSizes.filter((_, index) => index !== i)
                                  })}
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
                            <span className={`text-sm font-medium ${selectedPrinter?.isEnabled ? 'text-green-700' : 'text-red-700'}`}>
                              {selectedPrinter?.isEnabled ? 'Printer Enabled' : 'Printer Disabled'}
                            </span>
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                selectedPrinter && togglePrinter(selectedPrinter.id);
                              }}
                              className="relative inline-flex items-center cursor-pointer"
                            >
                              <input 
                                type="checkbox" 
                                checked={selectedPrinter?.isEnabled || false} 
                                readOnly
                                className="sr-only peer" 
                              />
                              <div className={`w-11 h-6 bg-red-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
                                rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                                peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] 
                                after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 
                                after:transition-all peer-checked:bg-green-500 shadow-inner transition-colors duration-200`}>
                              </div>
                            </div>
                          </div>
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
                              <p className="text-green-800 font-medium">{selectedPrinter?.name}</p>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 mt-1.5 flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Auto-detected by agent
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Model</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <p className="text-green-800 font-medium">{selectedPrinter?.model}</p>
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
                              {selectedPrinter?.capabilities.colorMode === 'color+bw' ? (
                                <Palette className="h-4 w-4 text-indigo-500 mr-2" />
                              ) : selectedPrinter?.capabilities.colorSupport ? (
                                <Palette className="h-4 w-4 text-purple-500 mr-2" />
                              ) : (
                                <Monitor className="h-4 w-4 text-gray-500 mr-2" />
                              )}
                              <p className="text-green-800 font-medium">
                                {selectedPrinter?.capabilities.colorMode === 'color+bw' 
                                  ? 'Color+B/W' 
                                  : selectedPrinter?.capabilities.colorSupport 
                                    ? 'Color' 
                                    : 'B/W'
                                }
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
                                {selectedPrinter?.capabilities.duplexSupport ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1.5">Paper Sizes</label>
                          <div className="px-4 py-3 bg-white rounded-lg border border-green-200 shadow-sm">
                            <p className="text-green-800 font-medium">{selectedPrinter?.capabilities.paperSizes.join(', ')}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedPrinter?.capabilities.paperSizes.map((size, i) => (
                              <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100">
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
                      onClick={() => selectedPrinter && useAgentValues(selectedPrinter.id)}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                    >
                      <Check className="h-5 w-5" />
                      <span>Use Agent Values</span>
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSelectedPrinter(null)}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveManualOverride}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                      >
                        <Save className="h-5 w-5" />
                        <span>Save Override</span>
                      </button>
                    </div>
                  </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
    </PartnerLayout>
  );
};

export default PrinterSettings;