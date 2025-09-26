import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, Download, RotateCcw, Filter } from 'lucide-react';

const MyOrdersPage = () => {
  const [filter, setFilter] = useState('all');

  const orders = [
    {
      id: 'PB123ABC45',
      fileName: 'Resume_Final.pdf',
      status: 'completed',
      statusText: 'Completed',
      date: '2025-01-15',
      time: '14:30',
      amount: 22,
      pages: 10,
      copies: 2,
      shop: 'Raj Digital Center'
    },
    {
      id: 'PB456DEF78',
      fileName: 'Project_Report.docx',
      status: 'ready',
      statusText: 'Ready for Pickup',
      date: '2025-01-15',
      time: '16:45',
      amount: 48,
      pages: 24,
      copies: 1,
      shop: 'Quick Print Hub'
    },
    {
      id: 'PB789GHI01',
      fileName: 'Presentation_Slides.pdf',
      status: 'printing',
      statusText: 'Printing',
      date: '2025-01-15',
      time: '17:20',
      amount: 75,
      pages: 15,
      copies: 3,
      shop: 'Digital Print Pro'
    },
    {
      id: 'PB234JKL56',
      fileName: 'Assignment_1.pdf',
      status: 'queued',
      statusText: 'In Queue',
      date: '2025-01-14',
      time: '09:15',
      amount: 16,
      pages: 8,
      copies: 1,
      shop: 'Campus Print Center'
    }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'completed', label: 'Completed' },
    { value: 'ready', label: 'Ready' },
    { value: 'printing', label: 'Printing' },
    { value: 'queued', label: 'In Queue' }
  ];

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'ready': return 'text-blue-600 bg-blue-100';
      case 'printing': return 'text-orange-600 bg-orange-100';
      case 'queued': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'ready':
        return CheckCircle;
      case 'printing':
      case 'queued':
      default:
        return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            My Orders
          </h1>
          <p className="text-lg text-gray-600">
            Track and manage all your print jobs
          </p>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                    filter === option.value
                      ? 'bg-lime-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Orders List */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-8 text-center"
            >
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "You haven't placed any orders yet." 
                  : `No orders with status "${filterOptions.find(f => f.value === filter)?.label}".`
                }
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Start Printing
              </Link>
            </motion.div>
          ) : (
            filteredOrders.map((order, index) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Order Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-start space-x-4">
                        <div className="bg-lime-100 p-3 rounded-xl">
                          <FileText className="h-6 w-6 text-lime-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-800 mb-1">
                            {order.fileName}
                          </h3>
                          <p className="text-gray-600 text-sm mb-2">
                            Order ID: <span className="font-mono">{order.id}</span>
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{order.pages} pages</span>
                            <span>•</span>
                            <span>{order.copies} copies</span>
                            <span>•</span>
                            <span>{order.shop}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {order.date} at {order.time}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className="h-5 w-5 text-gray-500" />
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.statusText}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between lg:justify-end space-x-3">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-800">₹{order.amount}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/order-status/${order.id}`}
                          className="inline-flex items-center px-4 py-2 bg-lime-500 text-white font-medium rounded-lg hover:bg-lime-600 transition-colors duration-200"
                        >
                          View
                        </Link>
                        {order.status === 'completed' && (
                          <>
                            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200">
                              <Download className="h-4 w-4 mr-1" />
                              Receipt
                            </button>
                            <button className="inline-flex items-center px-4 py-2 border border-lime-500 text-lime-600 font-medium rounded-lg hover:bg-lime-50 transition-colors duration-200">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reprint
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-slate-800">
              {orders.length}
            </h3>
            <p className="text-gray-600">Total Orders</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-lime-600">
              ₹{orders.reduce((sum, order) => sum + order.amount, 0)}
            </h3>
            <p className="text-gray-600">Total Spent</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-slate-800">
              {orders.reduce((sum, order) => sum + order.pages * order.copies, 0)}
            </h3>
            <p className="text-gray-600">Pages Printed</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MyOrdersPage;