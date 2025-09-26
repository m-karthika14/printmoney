import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Download, RotateCcw, Filter, Search, Eye } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const PrintHistory = () => {
  const [dateRange, setDateRange] = useState('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const historyJobs = [
    {
      id: 'PB123ABC45',
      fileName: 'Annual_Report_2024.pdf',
      customer: 'Tech Solutions Pvt Ltd',
      phone: '+91 98765 43210',
      pages: 85,
      copies: 3,
      colorMode: 'color',
      amount: 2040,
      completedAt: '2025-01-14T18:30:00',
      paymentStatus: 'paid',
      rating: 5
    },
    {
      id: 'PB456DEF78',
      fileName: 'Wedding_Album_Photos.pdf',
      customer: 'Ravi & Priya',
      phone: '+91 87654 32109',
      pages: 50,
      copies: 2,
      colorMode: 'color',
      amount: 800,
      completedAt: '2025-01-14T16:45:00',
      paymentStatus: 'paid',
      rating: 5
    },
    {
      id: 'PB789GHI01',
      fileName: 'Research_Paper.docx',
      customer: 'Dr. Anita Singh',
      phone: '+91 76543 21098',
      pages: 25,
      copies: 10,
      colorMode: 'bw',
      amount: 500,
      completedAt: '2025-01-14T14:20:00',
      paymentStatus: 'paid',
      rating: 4
    },
    {
      id: 'PB234JKL56',
      fileName: 'Legal_Documents.pdf',
      customer: 'Advocate Sharma',
      phone: '+91 65432 10987',
      pages: 120,
      copies: 1,
      colorMode: 'bw',
      amount: 240,
      completedAt: '2025-01-13T17:15:00',
      paymentStatus: 'paid',
      rating: 5
    },
    {
      id: 'PB567MNO89',
      fileName: 'Product_Catalog.pdf',
      customer: 'Fashion Hub',
      phone: '+91 54321 09876',
      pages: 32,
      copies: 20,
      colorMode: 'color',
      amount: 5120,
      completedAt: '2025-01-13T15:30:00',
      paymentStatus: 'paid',
      rating: 5
    },
    {
      id: 'PB890PQR12',
      fileName: 'Exam_Question_Papers.pdf',
      customer: 'St. Mary\'s School',
      phone: '+91 43210 98765',
      pages: 8,
      copies: 150,
      colorMode: 'bw',
      amount: 2400,
      completedAt: '2025-01-12T12:00:00',
      paymentStatus: 'paid',
      rating: 5
    }
  ];

  const filteredJobs = historyJobs.filter(job => {
    const matchesSearch = job.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'color' && job.colorMode === 'color') ||
                         (filterType === 'bw' && job.colorMode === 'bw');
    return matchesSearch && matchesFilter;
  });

  const totalRevenue = filteredJobs.reduce((sum, job) => sum + job.amount, 0);
  const totalJobs = filteredJobs.length;
  const avgRating = filteredJobs.reduce((sum, job) => sum + job.rating, 0) / filteredJobs.length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

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
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-medium text-gray-600">Completed Jobs</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalJobs}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-medium text-gray-600">Average Rating</h3>
            <div className="flex items-center mt-1">
              <p className="text-2xl font-bold text-gray-900 mr-2">{avgRating.toFixed(1)}</p>
              <div className="flex">{renderStars(Math.round(avgRating))}</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-medium text-gray-600">Pages Printed</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {filteredJobs.reduce((sum, job) => sum + (job.pages * job.copies), 0).toLocaleString()}
            </p>
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
                  placeholder="Search jobs or customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 w-64"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
              >
                <option value="all">All Types</option>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
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
            {filteredJobs.map((job, index) => (
              <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-green-100 p-3 rounded-xl">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{job.fileName}</h3>
                        <div className="flex items-center space-x-2">
                          {renderStars(job.rating)}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-1">{job.customer}</p>
                      <p className="text-sm text-gray-500 mb-2">{formatDate(job.completedAt)}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{job.pages} pages • {job.copies} copies</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.colorMode === 'color' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.colorMode === 'color' ? 'Color' : 'B&W'}
                        </span>
                        <span className="font-semibold text-gray-900">₹{job.amount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-lime-600 hover:text-lime-700 hover:bg-lime-50 rounded-lg transition-colors duration-200">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default PrintHistory;