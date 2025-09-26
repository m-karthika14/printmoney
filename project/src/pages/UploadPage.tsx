import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, Settings, Calculator, Clock, MapPin, CreditCard } from 'lucide-react';

const UploadPage = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [printOptions, setPrintOptions] = useState({
    copies: 1,
    pageRange: 'all',
    colorMode: 'bw',
    duplex: false,
    paperSize: 'A4',
  });

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const calculatePrice = () => {
    const basePrice = printOptions.colorMode === 'color' ? 8 : 2;
    const copies = printOptions.copies;
    const pages = 10; // Mock page count
    let total = basePrice * copies * pages;
    
    if (printOptions.duplex) {
      total *= 0.8; // 20% discount for duplex
    }
    
    return total;
  };

  const estimatedTime = () => {
    const baseTime = 10;
    const additionalTime = Math.floor(printOptions.copies / 10) * 2;
    return baseTime + additionalTime;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Upload & Configure Your Print Job
          </h1>
          <p className="text-lg text-gray-600">
            Upload your document and customize your printing preferences
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Upload className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-slate-800">Upload Document</h2>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  isDragOver
                    ? 'border-lime-500 bg-lime-50'
                    : uploadedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-lime-400 hover:bg-lime-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploadedFile ? (
                  <div className="space-y-4">
                    <FileText className="h-16 w-16 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-semibold text-slate-800">{uploadedFile.name}</p>
                      <p className="text-gray-600">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to print
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="text-lime-600 hover:text-lime-700 font-medium"
                    >
                      Upload different file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-16 w-16 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-semibold text-slate-800">
                        Drop your files here, or browse
                      </p>
                      <p className="text-gray-600">Supports PDF, DOCX files up to 50MB</p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-lime-500 text-white font-semibold rounded-lg hover:bg-lime-600 transition-colors duration-200 cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Print Options */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Settings className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-slate-800">Print Options</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={printOptions.copies}
                    onChange={(e) => setPrintOptions({ ...printOptions, copies: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Range
                  </label>
                  <select
                    value={printOptions.pageRange}
                    onChange={(e) => setPrintOptions({ ...printOptions, pageRange: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  >
                    <option value="all">All Pages</option>
                    <option value="odd">Odd Pages</option>
                    <option value="even">Even Pages</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPrintOptions({ ...printOptions, colorMode: 'bw' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                        printOptions.colorMode === 'bw'
                          ? 'bg-lime-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Black & White
                    </button>
                    <button
                      onClick={() => setPrintOptions({ ...printOptions, colorMode: 'color' })}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                        printOptions.colorMode === 'color'
                          ? 'bg-lime-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Color
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paper Size
                  </label>
                  <select
                    value={printOptions.paperSize}
                    onChange={(e) => setPrintOptions({ ...printOptions, paperSize: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={printOptions.duplex}
                      onChange={(e) => setPrintOptions({ ...printOptions, duplex: e.target.checked })}
                      className="w-5 h-5 text-lime-500 rounded focus:ring-lime-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Double-sided printing (Duplex) - Save 20%
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Summary Section */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Calculator className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-slate-800">Order Summary</h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Base Price per Page:</span>
                  <span className="font-semibold">₹{printOptions.colorMode === 'color' ? '8' : '2'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pages:</span>
                  <span className="font-semibold">10</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Copies:</span>
                  <span className="font-semibold">{printOptions.copies}</span>
                </div>
                
                {printOptions.duplex && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 text-green-600">
                    <span>Duplex Discount:</span>
                    <span className="font-semibold">-20%</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-200">
                  <span className="text-lg font-semibold text-slate-800">Total:</span>
                  <span className="text-2xl font-bold text-lime-600">₹{calculatePrice()}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Clock className="h-5 w-5 text-lime-500" />
                  <span>Ready in ~{estimatedTime()} minutes</span>
                </div>
                
                <div className="flex items-center space-x-3 text-gray-600">
                  <MapPin className="h-5 w-5 text-lime-500" />
                  <span>3 nearby shops available</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/payment')}
                disabled={!uploadedFile}
                className="w-full mt-6 bg-gradient-to-r from-lime-500 to-emerald-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <CreditCard className="h-5 w-5" />
                <span>Proceed to Payment</span>
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;