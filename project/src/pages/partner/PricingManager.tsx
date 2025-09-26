import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Save, RotateCcw, FileText, Palette, Plus, Trash2, Upload, Download } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const PricingManager = () => {
  const [pricing, setPricing] = useState({
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
    ]
  });

  const [saved, setSaved] = useState(false);
  
  // Custom discount form state
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    discountPercent: 0,
    isCustomName: false
  });

  // Fixed document form state
  const [newDocument, setNewDocument] = useState({
    docName: '',
    price: 0,
    file: null
  });

  const predefinedDiscounts = [
    'Student Discount',
    'Festival Discount', 
    'Referral Discount',
    'Bulk Order Discount',
    'First Time Customer',
    'Loyalty Discount'
  ];

  const handleSave = () => {
    // Simulate API call
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
      fixedDocuments: []
    });
  };

  const updatePricing = (field, value) => {
    setPricing({ ...pricing, [field]: parseFloat(value) || 0 });
  };

  // Custom discount functions
  const addCustomDiscount = () => {
    if (newDiscount.name && newDiscount.discountPercent > 0) {
      setPricing({
        ...pricing,
        customDiscounts: [...pricing.customDiscounts, {
          name: newDiscount.name,
          discountPercent: newDiscount.discountPercent
        }]
      });
      setNewDiscount({ name: '', discountPercent: 0, isCustomName: false });
    }
  };

  const removeCustomDiscount = (index) => {
    setPricing({
      ...pricing,
      customDiscounts: pricing.customDiscounts.filter((_, i) => i !== index)
    });
  };

  const updateCustomDiscount = (index, field, value) => {
    const updatedDiscounts = pricing.customDiscounts.map((discount, i) => 
      i === index ? { ...discount, [field]: field === 'discountPercent' ? parseFloat(value) || 0 : value } : discount
    );
    setPricing({ ...pricing, customDiscounts: updatedDiscounts });
  };

  // Fixed document functions
  const addFixedDocument = () => {
    if (newDocument.docName && newDocument.price > 0 && newDocument.file) {
      // In real app, upload file to server and get URL
      const docUrl = `/uploads/${newDocument.file.name}`;
      setPricing({
        ...pricing,
        fixedDocuments: [...pricing.fixedDocuments, {
          docName: newDocument.docName,
          docUrl: docUrl,
          price: newDocument.price
        }]
      });
      setNewDocument({ docName: '', price: 0, file: null });
    }
  };

  const removeFixedDocument = (index) => {
    setPricing({
      ...pricing,
      fixedDocuments: pricing.fixedDocuments.filter((_, i) => i !== index)
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
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Manager</h1>
            <p className="text-gray-600 mt-2">Configure your print shop pricing and discounts</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-600 transition-colors duration-200"
            >
              <Save className="h-5 w-5" />
              <span>{saved ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Pricing Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Single/Double Side Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <FileText className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Single/Double Side Pricing</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    B&W Single Side (per page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={pricing.bwSingleSidePrice}
                      onChange={(e) => updatePricing('bwSingleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Single Side (per page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={pricing.colorSingleSidePrice}
                      onChange={(e) => updatePricing('colorSingleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    B&W Double Side (per page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={pricing.bwDoubleSidePrice}
                      onChange={(e) => updatePricing('bwDoubleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Double Side (per page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={pricing.colorDoubleSidePrice}
                      onChange={(e) => updatePricing('colorDoubleSidePrice', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Additional Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Palette className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Additional Services</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spiral Binding
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={pricing.bindingSpiral}
                      onChange={(e) => updatePricing('bindingSpiral', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hardcover Binding
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={pricing.bindingHardcover}
                      onChange={(e) => updatePricing('bindingHardcover', e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    A3 Paper Surcharge (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={pricing.paperA3Surcharge}
                      onChange={(e) => updatePricing('paperA3Surcharge', e.target.value)}
                      className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Custom Discounts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Custom Discounts</h2>
              </div>

              {/* Add New Discount Form */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Name
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount Percentage
                    </label>
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

              {/* Existing Discounts List */}
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

            {/* Fixed Document Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Fixed Document Pricing</h2>
              </div>

              {/* Add New Document Form */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={newDocument.docName}
                      onChange={(e) => setNewDocument({ ...newDocument, docName: e.target.value })}
                      placeholder="e.g., Lab Manual, Syllabus"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fixed Price
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Document
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files[0] })}
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

              {/* Existing Documents List */}
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

            {/* Bulk Discounts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-gray-900">Bulk Discounts</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    10-49 Pages (% off)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="25"
                      value={pricing.bulkDiscount10}
                      onChange={(e) => updatePricing('bulkDiscount10', e.target.value)}
                      className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    50-99 Pages (% off)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="25"
                      value={pricing.bulkDiscount50}
                      onChange={(e) => updatePricing('bulkDiscount50', e.target.value)}
                      className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    100+ Pages (% off)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="25"
                      value={pricing.bulkDiscount100}
                      onChange={(e) => updatePricing('bulkDiscount100', e.target.value)}
                      className="w-full pr-8 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Price Calculator Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Price Calculator</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Sample: 20 pages, 2 copies, B&W Single</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base (20 × 2 × ₹{pricing.bwSingleSidePrice}):</span>
                      <span>₹{20 * 2 * pricing.bwSingleSidePrice}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Bulk discount (10-49 pages):</span>
                      <span>-₹{Math.round(20 * 2 * pricing.bwSingleSidePrice * pricing.bulkDiscount10 / 100)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{Math.round(20 * 2 * pricing.bwSingleSidePrice * (1 - pricing.bulkDiscount10 / 100))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Sample: 10 pages, 1 copy, Color Double</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base (10 × 1 × ₹{pricing.colorDoubleSidePrice}):</span>
                      <span>₹{10 * 1 * pricing.colorDoubleSidePrice}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>₹{10 * 1 * pricing.colorDoubleSidePrice}</span>
                    </div>
                  </div>
                </div>

                {/* Show active discounts */}
                {pricing.customDiscounts.length > 0 && (
                  <div className="bg-lime-50 rounded-lg p-4">
                    <h3 className="font-medium text-lime-800 mb-2">Active Discounts</h3>
                    <div className="space-y-1">
                      {pricing.customDiscounts.map((discount, index) => (
                        <div key={index} className="flex justify-between text-sm text-lime-700">
                          <span>{discount.name}:</span>
                          <span>{discount.discountPercent}% off</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show fixed documents */}
                {pricing.fixedDocuments.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Fixed Price Documents</h3>
                    <div className="space-y-1">
                      {pricing.fixedDocuments.map((doc, index) => (
                        <div key={index} className="flex justify-between text-sm text-blue-700">
                          <span>{doc.docName}:</span>
                          <span>₹{doc.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-lime-50 rounded-lg p-4">
                  <h3 className="font-medium text-lime-800 mb-2">Pricing Tips</h3>
                  <ul className="text-sm text-lime-700 space-y-1">
                    <li>• Double-side typically costs 1.5x single-side</li>
                    <li>• Color prints usually 3-4x B&W price</li>
                    <li>• Bulk discounts encourage larger orders</li>
                    <li>• Fixed documents save time for regulars</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default PricingManager;