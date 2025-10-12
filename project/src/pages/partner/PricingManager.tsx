import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Save, RotateCcw, FileText, Palette, Plus, Trash2, Upload, Download, ChevronRight } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const PricingManager = () => {
  const predefinedDiscounts = [
    'Bulk-10-49 Pages (% off)',
    'Bulk-50-99 Pages (% off)',
    'Bulk-100+ Pages (% off)',
    'Student Discount',
    'Festival Offer',
    'First Time Customer',
  ];

  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);

  const predefinedServicesList = [
    'Black & White Photocopy',
    'Color Photocopy',
    'Photo Printing (Passport Size)',
    'Photo Printing (Postcard Size)',
    'Document Scanning',
    'Photo Scanning',
    'ID Card Scanning',
    'Email & Fax Service',
    'Spiral Binding',
    'Thermal Binding',
    'Wiro Binding',
    'Hard Binding',
    'Lamination (Card)',
    'Lamination (A4)',
    'Lamination (A3)',
    'Foam Board Mounting'
  ];

  interface Service {
    id: string;
    name: string;
    price: string;
    selected: boolean;
    isCustom?: boolean;
  }
  
  interface CustomService {
    id: string;
    name: string;
    price: string;
    isCustom: boolean;
    selected?: boolean;
  }

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [dropdownServiceId, setDropdownServiceId] = useState('');
  const [dropdownServicePrice, setDropdownServicePrice] = useState('');
  const [servicesSaved, setServicesSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newDiscount, setNewDiscount] = useState({
    name: '',
    discountPercent: 0,
    isCustomName: false
  });

  const [newDocument, setNewDocument] = useState({
    docName: '',
    price: 0,
    file: null as File | null
  });

  type PaperSizeType = "A3" | "A5" | "Legal" | "Letter" | "Photo" | "Custom";
  type PrintType = "bwSingle" | "colorSingle" | "bwDouble" | "colorDouble";
  type PaperSizePricing = {
    [size in PaperSizeType]: {
      [type in PrintType]: number;
    };
  };

  interface PricingState {
    bwSingleSidePrice: number;
    colorSingleSidePrice: number;
    bwDoubleSidePrice: number;
    colorDoubleSidePrice: number;
    bindingSpiral: number;
    bindingHardcover: number;
    paperA3Surcharge: number;
    bulkDiscount10: number;
    bulkDiscount50: number;
    bulkDiscount100: number;
    customDiscounts: { name: string; discountPercent: number }[];
    fixedDocuments: { docName: string; docUrl: string; price: number }[];
    paperSizePricing: PaperSizePricing;
  }

  const [pricing, setPricing] = useState<PricingState>({
    bwSingleSidePrice: 2,
    colorSingleSidePrice: 8,
    bwDoubleSidePrice: 3,
    colorDoubleSidePrice: 12,
    bindingSpiral: 15,
    bindingHardcover: 50,
    paperA3Surcharge: 50,
    bulkDiscount10: 5,
    bulkDiscount50: 10,
    bulkDiscount100: 15,
    customDiscounts: [
      { name: 'Student Discount', discountPercent: 10 },
      { name: 'Festival Offer', discountPercent: 15 }
    ],
    fixedDocuments: [
      { docName: 'Lab Manual.pdf', docUrl: '/uploads/lab-manual.pdf', price: 50 },
      { docName: 'Syllabus.pdf', docUrl: '/uploads/syllabus.pdf', price: 30 }
    ],
    paperSizePricing: {
      A3: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
      A5: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
      Legal: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
      Letter: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
      Photo: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
      Custom: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 }
    }
  });

  const [dbPricing, setDbPricing] = useState({
    bwSingleSidePrice: 2,
    colorSingleSidePrice: 8,
    bwDoubleSidePrice: 3,
    colorDoubleSidePrice: 12
  });

  const [shopId, setShopId] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('shopId');
    if (id) {
      setShopId(id);
    }
  }, []);

  useEffect(() => {
    if (!shopId) return;
    fetch(`http://localhost:5000/api/newshop/${shopId}/fixed-documents`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPricing(prev => ({ ...prev, fixedDocuments: data }));
        }
      })
      .catch(err => console.error(err));
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;

    fetch(`http://localhost:5000/api/shops/shop/${shopId}/pricing`)
      .then(res => res.json())
      .then(data => {
        const p = data.pricing || {};
        setDbPricing({
          bwSingleSidePrice: p.bwSingle ? parseFloat(p.bwSingle) : 2,
          colorSingleSidePrice: p.colorSingle ? parseFloat(p.colorSingle) : 8,
          bwDoubleSidePrice: p.bwDouble ? parseFloat(p.bwDouble) : 3,
          colorDoubleSidePrice: p.colorDouble ? parseFloat(p.colorDouble) : 12
        });
      });

    fetch(`http://localhost:5000/api/shops/shop/${shopId}/paper-size-pricing`)
      .then(res => res.json())
      .then(data => {
        if (data.paperSizePricing) {
          setPricing(prev => ({ ...prev, paperSizePricing: data.paperSizePricing }));
        }
      });

    fetch(`http://localhost:5000/api/newshop/${shopId}/discounts`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPricing(prev => ({ ...prev, customDiscounts: data }));
        }
      });

    fetch(`http://localhost:5000/api/shops/${shopId}`)
      .then(res => res.json())
      .then(data => {
        const allServices = Array.isArray(data.services) ? data.services : [];
        setSelectedServices(allServices.filter((s: any) => !s.isCustom && s.selected).map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price || '',
          selected: true,
          isCustom: false
        })));
        setCustomServices(allServices.filter((s: any) => s.isCustom).map((s: any) => ({
          id: s.id,
          name: s.name,
          price: s.price || '',
          isCustom: true
        })));
      });
  }, [shopId]);

  const handleAddPredefinedService = async () => {
    if (!dropdownServiceId || !dropdownServicePrice || !shopId) return;
    
    const serviceIndex = parseInt(dropdownServiceId) - 1;
    const serviceName = predefinedServicesList[serviceIndex];
    
    if (!serviceName) return;
    
    const updatedService = { 
      id: dropdownServiceId,
      name: serviceName,
      price: dropdownServicePrice,
      selected: true,
      isCustom: false
    };
    
    setSelectedServices(prev => {
      const updatedSelectedServices = [...prev, updatedService];
      const allServices = [...updatedSelectedServices, ...customServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();
      
      return updatedSelectedServices;
    });
    
    setDropdownServiceId('');
    setDropdownServicePrice('');
  };

  const handleUpdateServicePrice = async (id: string, price: string) => {
    if (!shopId) return;
    
    setSelectedServices(prev => {
      const updatedSelected = prev.map((s) => s.id === id ? { ...s, price } : s);
      const allServices = [...updatedSelected, ...customServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();

      return updatedSelected;
    });
  };

  const handleRemoveService = async (id: string) => {
    if (!shopId) return;
    
    setSelectedServices(prev => {
      const updatedServices = prev.filter((s) => s.id !== id);
      const allServices = [...updatedServices, ...customServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();
      
      return updatedServices;
    });
  };

  const handleAddCustomService = async () => {
    if (!shopId) {
      alert('Error: Shop ID not found. Please try refreshing the page.');
      return;
    }
    
    const newCustomService = { 
      id: `custom_${Date.now().toString()}`, 
      name: '', 
      price: '', 
      isCustom: true 
    };
    
    setCustomServices(prev => {
      const updatedCustomServices = [...prev, newCustomService];
      const allServices = [...selectedServices, ...updatedCustomServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();
      
      return updatedCustomServices;
    });
  };

  const handleUpdateCustomService = async (id: string, field: string, value: string) => {
    if (!shopId) return;
    
    setCustomServices(prev => {
      const updatedCustomServices = prev.map((s) => s.id === id ? { ...s, [field]: value } : s);
      const allServices = [...selectedServices, ...updatedCustomServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();

      return updatedCustomServices;
    });
  };

  const handleRemoveCustomService = async (id: string) => {
    if (!shopId) return;
    
    setCustomServices(prev => {
      const updatedCustomServices = prev.filter((s) => s.id !== id);
      const allServices = [...selectedServices, ...updatedCustomServices];

      (async () => {
        try {
          await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services: allServices })
          });
        } catch (err) {
          console.error(err);
        }
      })();
      
      return updatedCustomServices;
    });
  };

  const handleSaveServices = async () => {
    if (!shopId) {
      alert('Error: Shop ID not found. Please try refreshing the page.');
      return;
    }
    
    const allServices = [...selectedServices, ...customServices];
    setServicesSaved(false);
    setIsSaving(true);
    
    try {
      const response = await fetch(`http://localhost:5000/api/shops/${shopId}/services`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: allServices })
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        setIsSaving(false);
        setServicesSaved(true);
        setTimeout(() => setServicesSaved(false), 2000);
      } else {
        setIsSaving(false);
        alert('Error saving services: ' + (responseData.message || 'Unknown error'));
      }
    } catch (err) {
      setIsSaving(false);
      alert('Error saving services. Please check your network connection.');
    }
  };

  const handleSave = async () => {
    try {
      await fetch(`http://localhost:5000/api/shops/shop/${shopId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bwSingle: dbPricing.bwSingleSidePrice,
          colorSingle: dbPricing.colorSingleSidePrice,
          bwDouble: dbPricing.bwDoubleSidePrice,
          colorDouble: dbPricing.colorDoubleSidePrice
        })
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving pricing:', err);
    }
  };

  const handleReset = () => {
    setPricing({
      bwSingleSidePrice: 2,
      colorSingleSidePrice: 8,
      bwDoubleSidePrice: 3,
      colorDoubleSidePrice: 12,
      bindingSpiral: 15,
      bindingHardcover: 50,
      paperA3Surcharge: 50,
      bulkDiscount10: 5,
      bulkDiscount50: 10,
      bulkDiscount100: 15,
      customDiscounts: [],
      fixedDocuments: [],
      paperSizePricing: {
        A3: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
        A5: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
        Legal: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
        Letter: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
        Photo: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 },
        Custom: { bwSingle: 0, colorSingle: 0, bwDouble: 0, colorDouble: 0 }
      }
    });
    
    setDbPricing({
      bwSingleSidePrice: 2,
      colorSingleSidePrice: 8,
      bwDoubleSidePrice: 3,
      colorDoubleSidePrice: 12
    });
  };

  const updateDbPricing = (field: string, value: string) => {
    setDbPricing({ ...dbPricing, [field]: parseFloat(value) || 0 });
  };

  const addCustomDiscount = () => {
    if (newDiscount.name && newDiscount.discountPercent > 0) {
      const updatedDiscounts = [...pricing.customDiscounts, {
        name: newDiscount.name,
        discountPercent: newDiscount.discountPercent
      }];
      setPricing({ ...pricing, customDiscounts: updatedDiscounts });
      setNewDiscount({ name: '', discountPercent: 0, isCustomName: false });
      fetch(`http://localhost:5000/api/newshop/${shopId}/discounts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDiscounts: updatedDiscounts })
      }).catch(err => console.error(err));
    }
  };

  const removeCustomDiscount = (index: number) => {
    const updatedDiscounts = pricing.customDiscounts.filter((_, i) => i !== index);
    setPricing({ ...pricing, customDiscounts: updatedDiscounts });
    fetch(`http://localhost:5000/api/newshop/${shopId}/discounts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customDiscounts: updatedDiscounts })
    }).catch(err => console.error(err));
  };

  const updateCustomDiscount = (index: number, field: string, value: string) => {
    const updatedDiscounts = pricing.customDiscounts.map((discount, i) => 
      i === index ? { ...discount, [field]: field === 'discountPercent' ? parseFloat(value) || 0 : value } : discount
    );
    setPricing({ ...pricing, customDiscounts: updatedDiscounts });
    fetch(`http://localhost:5000/api/newshop/${shopId}/discounts`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customDiscounts: updatedDiscounts })
    }).catch(err => console.error(err));
  };

  const addFixedDocument = () => {
    if (newDocument.docName && newDocument.price > 0 && newDocument.file) {
      const docUrl = `/uploads/${newDocument.file.name}`;
      const updatedDocs = [...pricing.fixedDocuments, {
        docName: newDocument.docName,
        docUrl: docUrl,
        price: newDocument.price
      }];
      setPricing({ ...pricing, fixedDocuments: updatedDocs });
      setNewDocument({ docName: '', price: 0, file: null });
      fetch(`http://localhost:5000/api/newshop/${shopId}/fixed-documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixedDocuments: updatedDocs })
      }).catch(err => console.error(err));
    }
  };

  const removeFixedDocument = (index: number) => {
    const updatedDocs = pricing.fixedDocuments.filter((_, i) => i !== index);
    setPricing({ ...pricing, fixedDocuments: updatedDocs });
    fetch(`http://localhost:5000/api/newshop/${shopId}/fixed-documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixedDocuments: updatedDocs })
    }).catch(err => console.error(err));
  };

  // UI Components
  const ServiceDropdown = () => (
    <div className="mb-6 flex gap-4 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add Predefined Service</label>
        <select
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={dropdownServiceId}
          onChange={e => setDropdownServiceId(e.target.value)}
        >
          <option value="">Select service</option>
          {predefinedServicesList.map((name, idx) => {
            const serviceId = (idx + 1).toString();
            return (
              <option key={serviceId} value={serviceId} disabled={selectedServices.some((sel) => sel.id === serviceId)}>
                {name}
              </option>
            );
          })}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
        <PriceInput
          id="dropdown"
          initialValue={dropdownServicePrice}
          onUpdate={(_, value) => setDropdownServicePrice(value)}
        />
      </div>
      <button
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center transition-all duration-300 hover:scale-105 disabled:opacity-50"
        onClick={handleAddPredefinedService}
        disabled={!dropdownServiceId || !dropdownServicePrice}
      >
        <Plus className="w-5 h-5 mr-2" /> Add
      </button>
    </div>
  );

  const SelectedServicesList = () => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Selected Services</h3>
      {selectedServices.length === 0 ? (
        <div className="text-gray-500">No services selected.</div>
      ) : (
        <div className="space-y-3">
          {selectedServices.map((service) => (
            <div key={service.id} className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl">
              <div className="flex-1 font-semibold text-gray-800">{service.name}</div>
              <PriceInput 
                id={service.id}
                initialValue={service.price}
                onUpdate={(id, value) => handleUpdateServicePrice(id, value)}
              />
              <button
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                onClick={() => handleRemoveService(service.id)}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const PriceInput = ({ id, initialValue, onUpdate }: { id: string; initialValue: string | number; onUpdate: (id: string, value: string) => void }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };
    
    const handleBlur = () => {
      onUpdate(id, localValue.toString());
    };
    
    useEffect(() => {
      setLocalValue(initialValue || '');
    }, [initialValue]);
    
    return (
      <input
        type="number"
        min="0"
        step="0.01"
        className="w-32 px-2 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0.00"
      />
    );
  };
  
  const NameInput = ({ id, initialValue, onUpdate }: { id: string; initialValue: string; onUpdate: (id: string, value: string) => void }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    };
    
    const handleBlur = () => {
      onUpdate(id, localValue);
    };
    
    useEffect(() => {
      setLocalValue(initialValue || '');
    }, [initialValue]);
    
    return (
      <input
        type="text"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Service name"
      />
    );
  };

  const CustomServicesList = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-900">Custom Services</h3>
        <button
          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl font-semibold inline-flex items-center transition-all duration-300 hover:scale-105"
          onClick={handleAddCustomService}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Custom
        </button>
      </div>
      {customServices.length === 0 ? (
        <div className="text-gray-500">No custom services added.</div>
      ) : (
        <div className="space-y-3">
          {customServices.map((service) => (
            <div key={service.id} className="flex items-center gap-4 bg-green-50 p-4 rounded-xl">
              <NameInput 
                id={service.id}
                initialValue={service.name || ''}
                onUpdate={(id, value) => handleUpdateCustomService(id, 'name', value)}
              />
              <PriceInput
                id={service.id}
                initialValue={service.price || ''}
                onUpdate={(id, value) => handleUpdateCustomService(id, 'price', value)}
              />
              <button
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                onClick={() => handleRemoveCustomService(service.id)}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <PartnerLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Manager</h1>
            <p className="text-gray-600 mt-2">Configure your print shop pricing and discounts</p>
          </div>
          <div className="flex space-x-3">
            {/* Reset button removed as requested */}
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-600 transition-colors duration-200"
            >
              <Save className="h-5 w-5" />
              <span>{saved ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </motion.div>

        <div className="flex justify-center">
          <div className="flex flex-col items-center space-y-10 w-full max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-10 w-full"
            >
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Single/Double Side Pricing</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">B&W Single Side (per page)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={dbPricing.bwSingleSidePrice}
                      onChange={(e) => updateDbPricing('bwSingleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Single Side (per page)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={dbPricing.colorSingleSidePrice}
                      onChange={(e) => updateDbPricing('colorSingleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">B&W Double Side (per page)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={dbPricing.bwDoubleSidePrice}
                      onChange={(e) => updateDbPricing('bwDoubleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Double Side (per page)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={dbPricing.colorDoubleSidePrice}
                      onChange={(e) => updateDbPricing('colorDoubleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>
              </div>
              {/* Save button for Single/Double Side Pricing */}
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition"
                  onClick={async () => {
                    try {
                      await fetch(`http://localhost:5000/api/shops/shop/${shopId}/pricing`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bwSingle: dbPricing.bwSingleSidePrice,
                          colorSingle: dbPricing.colorSingleSidePrice,
                          bwDouble: dbPricing.bwDoubleSidePrice,
                          colorDouble: dbPricing.colorDoubleSidePrice
                        })
                      });
                      alert('Single/Double Side Pricing saved!');
                    } catch (err) {
                      alert('Error saving Single/Double Side Pricing.');
                      console.error(err);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </motion.div>


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-10 w-full"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Palette className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Additional Services</h2>
              </div>
              <ServiceDropdown />
              <SelectedServicesList />
              <CustomServicesList />
              <div className="text-center mt-6">
                <button
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg disabled:opacity-50"
                  onClick={handleSaveServices}
                  disabled={(selectedServices.length === 0 && customServices.length === 0) || isSaving}
                >
                  {isSaving ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2 inline" />
                      {servicesSaved ? 'Saved!' : 'Save Services'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-10 w-full"
            >
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Custom Discounts</h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Name</label>
                    {newDiscount.isCustomName ? (
                      <input
                        type="text"
                        value={newDiscount.name}
                        onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                        placeholder="Enter custom discount name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    ) : (
                      <select
                        value={newDiscount.name}
                        onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      >
                        <option value="">Select discount type</option>
                        {predefinedDiscounts.map((discount) => (
                          <option key={discount} value={discount}>{discount}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Percentage</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newDiscount.discountPercent}
                        onChange={(e) => setNewDiscount({ ...newDiscount, discountPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-end space-x-2">
                    <button
                      onClick={addCustomDiscount}
                      className="flex items-center space-x-2 bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition-colors duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="customName"
                    checked={newDiscount.isCustomName}
                    onChange={(e) => setNewDiscount({ ...newDiscount, isCustomName: e.target.checked, name: '' })}
                    className="rounded text-lime-500 focus:ring-lime-500"
                  />
                  <label htmlFor="customName" className="text-sm text-gray-600">
                    Use custom discount name
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                {pricing.customDiscounts.map((discount, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-lime-50 rounded-lg border border-lime-200">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={discount.name}
                        onChange={(e) => updateCustomDiscount(index, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discount.discountPercent}
                          onChange={(e) => updateCustomDiscount(index, 'discountPercent', e.target.value)}
                          className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCustomDiscount(index)}
                      className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-10 w-full"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Fixed Document Pricing</h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
                    <input
                      type="text"
                      value={newDocument.docName}
                      onChange={(e) => setNewDocument({ ...newDocument, docName: e.target.value })}
                      placeholder="e.g., Lab Manual, Syllabus"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={newDocument.price}
                        onChange={(e) => setNewDocument({ ...newDocument, price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Document</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const files = e.target.files;
                        setNewDocument({ ...newDocument, file: files && files.length > 0 ? files[0] : null });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <button
                  onClick={addFixedDocument}
                  disabled={!newDocument.docName || !newDocument.price || !newDocument.file}
                  className="flex items-center space-x-2 bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Document</span>
                </button>
              </div>

              <div className="space-y-3">
                {pricing.fixedDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{doc.docName}</h4>
                        <p className="text-sm text-gray-600">Fixed Price: ₹{doc.price}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors duration-200">
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFixedDocument(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, delay: 0.5 }}
  className="bg-white rounded-2xl shadow-lg p-10 w-full"
>
  <div className="flex items-center space-x-3 mb-6">
  <Palette className="h-6 w-6 text-lime-500" />
    <h2 className="text-xl font-semibold text-gray-900">Paper Size Pricing</h2>
  </div>

  <div className="space-y-4">
    {["A3", "A5", "Legal", "Letter", "Photo", "Custom"].map((size) => (
      <div key={size} className="border rounded-xl overflow-hidden shadow-sm">
        <div
          className="flex justify-between items-center px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
          onClick={() =>
            setExpandedPaper((prev) => (prev === size ? null : size))
          }
        >
          <span className="font-semibold text-gray-800">{size}</span>
          <motion.span
            animate={{ rotate: expandedPaper === size ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </motion.span>
        </div>

        <AnimatePresence>
          {expandedPaper === size && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-4 bg-white border-t space-y-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "B/W Single", key: "bwSingle" },
                  { label: "Color Single", key: "colorSingle" },
                  { label: "B/W Double", key: "bwDouble" },
                  { label: "Color Double", key: "colorDouble" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-gray-600 mb-1 text-sm">{label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center"
                      value={pricing.paperSizePricing?.[size as PaperSizeType]?.[key as PrintType] ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPricing((prev) => ({
                          ...prev,
                          paperSizePricing: {
                            ...prev.paperSizePricing,
                            [size]: {
                              ...prev.paperSizePricing?.[size as PaperSizeType],
                              [key]: val,
                            },
                          },
                        }));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>

              {/* ✅ Save Button */}
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600 transition"
                  onClick={async () => {
                    try {
                      await fetch(`http://localhost:5000/api/shops/shop/${shopId}/paper-size-pricing`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ paperSizePricing: pricing.paperSizePricing })
                      });
                      // Optionally show feedback
                      alert('Paper size pricing saved!');
                    } catch (err) {
                      alert('Error saving paper size pricing.');
                      console.error(err);
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ))}
  </div>
</motion.div>

          </div>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default PricingManager;