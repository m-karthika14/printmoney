import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle, Printer, DollarSign, FileText, Users, AlertCircle, ClipboardList } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const Dashboard = () => {
  const stats = [
    {
      title: 'Today\'s Earnings',
      value: '₹3,240',
      change: '+18%',
      changeType: 'increase',
      icon: DollarSign,
    },
    {
      title: 'Print Jobs Today',
      value: '42',
      change: '+15%',
      changeType: 'increase',
      icon: CheckCircle,
    },
    {
      title: 'Pending Jobs',
      value: '7',
      change: '3 printing',
      changeType: 'neutral',
      icon: Clock,
    },
    {
      title: 'Printer Status',
      value: '2/3',
      change: 'Online',
      changeType: 'increase',
      icon: Printer,
    },
  ];

  const recentJobs = [
    {
      id: 'PB123ABC45',
      fileName: 'Resume_Final.pdf',
      customer: 'Priya Sharma',
      pages: 10,
      copies: 2,
      amount: 32,
      status: 'printing',
      time: '2 min ago'
    },
    {
      id: 'PB456DEF78',
      fileName: 'Project_Report.docx',
      customer: 'Rahul Kumar',
      pages: 24,
      copies: 1,
      amount: 48,
      status: 'queued',
      time: '5 min ago'
    },
    {
      id: 'PB789GHI01',
      fileName: 'Presentation.pdf',
      customer: 'Anita Singh',
      pages: 15,
      copies: 3,
      amount: 90,
      status: 'completed',
      time: '15 min ago'
    }
  ];

  const printerStatus = [
    { name: 'HP LaserJet Pro', status: 'online', type: 'B&W', jobs: 3 },
    { name: 'Canon Color Printer', status: 'online', type: 'Color', jobs: 2 },
    { name: 'Epson WorkForce', status: 'offline', type: 'Color', jobs: 0 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'printing': return 'text-orange-600 bg-orange-100';
      case 'queued': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <PartnerLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-lime-500 to-emerald-500 rounded-2xl p-6 text-white mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Hi Raj Digital Center! 👋</h1>
              <p className="text-lime-100 mt-2">Here's your dashboard overview for today</p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg px-4 py-2">
                <p className="text-sm text-lime-100">Shop Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Open & Accepting Jobs</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="bg-lime-100 rounded-xl p-3">
                  <stat.icon className="h-6 w-6 text-lime-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 
                  stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">from yesterday</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Jobs</h2>
              <a href="/job-queue" className="text-lime-600 hover:text-lime-700 font-medium">
                View all →
              </a>
            </div>
            <div className="space-y-4">
              {recentJobs.map((job, index) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-lime-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-lime-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{job.fileName}</p>
                      <p className="text-sm text-gray-600">{job.customer} • {job.pages} pages • {job.copies} copies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{job.amount}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs text-gray-500">{job.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Printer Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Printer Status</h2>
              <a href="/printers" className="text-lime-600 hover:text-lime-700 font-medium">
                Manage →
              </a>
            </div>
            <div className="space-y-4">
              {printerStatus.map((printer, index) => (
                <div key={printer.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                      printer.status === 'online' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {printer.status === 'online' ? (
                        <Printer className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{printer.name}</p>
                      <p className="text-sm text-gray-600">{printer.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      printer.status === 'online' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {printer.status}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">{printer.jobs} active jobs</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/job-queue" className="flex flex-col items-center p-4 bg-lime-50 rounded-xl hover:bg-lime-100 transition-colors duration-200">
              <ClipboardList className="h-8 w-8 text-lime-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Queue</span>
            </a>
            <a href="/pricing" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors duration-200">
              <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Update Pricing</span>
            </a>
            <a href="/printers" className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors duration-200">
              <Printer className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Printer Settings</span>
            </a>
            <a href="/analytics" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors duration-200">
              <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </a>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default Dashboard;