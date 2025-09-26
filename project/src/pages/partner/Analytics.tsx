import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, FileText, Users, Calendar, BarChart3 } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');

  const stats = {
    revenue: { current: 12450, previous: 10200, change: 22 },
    jobs: { current: 185, previous: 162, change: 14 },
    customers: { current: 89, previous: 78, change: 14 },
    avgOrder: { current: 67, previous: 63, change: 6 }
  };

  const dailyData = [
    { date: 'Mon', revenue: 1200, jobs: 15 },
    { date: 'Tue', revenue: 1800, jobs: 23 },
    { date: 'Wed', revenue: 1650, jobs: 19 },
    { date: 'Thu', revenue: 2100, jobs: 28 },
    { date: 'Fri', revenue: 2350, jobs: 31 },
    { date: 'Sat', revenue: 1900, jobs: 25 },
    { date: 'Sun', revenue: 1450, jobs: 18 }
  ];

  const popularServices = [
    { service: 'B&W Printing', orders: 125, revenue: 3750, percentage: 68 },
    { service: 'Color Printing', orders: 45, revenue: 5400, percentage: 24 },
    { service: 'Spiral Binding', orders: 12, revenue: 480, percentage: 6 },
    { service: 'A3 Printing', orders: 3, revenue: 270, percentage: 2 }
  ];

  const errorLogs = [
    { time: '14:30', printer: 'HP LaserJet Pro', error: 'Paper jam cleared', severity: 'low' },
    { time: '12:15', printer: 'Canon PIXMA', error: 'Low ink warning', severity: 'medium' },
    { time: '09:45', printer: 'Epson WorkForce', error: 'Connection timeout', severity: 'high' },
    { time: '08:20', printer: 'HP LaserJet Pro', error: 'Print job completed successfully', severity: 'success' }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'low': return 'text-yellow-600 bg-yellow-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Track your shop performance and insights</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              title: 'Revenue', 
              icon: DollarSign, 
              value: `₹${stats.revenue.current.toLocaleString()}`, 
              change: stats.revenue.change,
              color: 'lime'
            },
            { 
              title: 'Total Jobs', 
              icon: FileText, 
              value: stats.jobs.current.toString(), 
              change: stats.jobs.change,
              color: 'blue'
            },
            { 
              title: 'Customers', 
              icon: Users, 
              value: stats.customers.current.toString(), 
              change: stats.customers.change,
              color: 'purple'
            },
            { 
              title: 'Avg Order', 
              icon: TrendingUp, 
              value: `₹${stats.avgOrder.current}`, 
              change: stats.avgOrder.change,
              color: 'orange'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
                </div>
                <div className={`bg-${metric.color}-100 rounded-xl p-3`}>
                  <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm font-medium text-green-600">
                  +{metric.change}%
                </span>
                <span className="text-sm text-gray-500 ml-2">from last {timeRange}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Daily Revenue</h2>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {dailyData.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-600 w-8">{day.date}</span>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-2 w-32">
                        <div 
                          className="bg-lime-500 rounded-full h-2" 
                          style={{ width: `${(day.revenue / 2500) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₹{day.revenue}</p>
                    <p className="text-xs text-gray-500">{day.jobs} jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Popular Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Popular Services</h2>
            
            <div className="space-y-4">
              {popularServices.map((service, index) => (
                <div key={service.service} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{service.service}</span>
                      <span className="text-sm text-gray-600">{service.percentage}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full h-2" 
                        style={{ width: `${service.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{service.orders} orders</span>
                      <span className="text-xs font-medium text-gray-700">₹{service.revenue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Error Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Logs</h2>
          
          <div className="space-y-3">
            {errorLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-500">{log.time}</span>
                  <span className="text-sm font-medium text-gray-900">{log.printer}</span>
                  <span className="text-sm text-gray-700">{log.error}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                  {log.severity}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default Analytics;