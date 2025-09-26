import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, FileText, Download, Eye, Clock, User, Phone } from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const JobQueue = () => {
  const [jobs, setJobs] = useState([
    {
      id: 'PB123ABC45',
      fileName: 'Project_Report.pdf',
      customer: 'Priya Sharma',
      phone: '+91 98765 43210',
      pages: 25,
      copies: 2,
      colorMode: 'bw',
      amount: 100,
      status: 'queued',
      timeReceived: '2025-01-15T16:45:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB456DEF78',
      fileName: 'Marketing_Brochure.pdf',
      customer: 'Rahul Kumar',
      phone: '+91 87654 32109',
      pages: 8,
      copies: 50,
      colorMode: 'color',
      amount: 3200,
      status: 'printing',
      timeReceived: '2025-01-15T16:30:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB789GHI01',
      fileName: 'Thesis_Final.docx',
      customer: 'Anita Singh',
      phone: '+91 76543 21098',
      pages: 120,
      copies: 1,
      colorMode: 'bw',
      amount: 240,
      status: 'printing',
      timeReceived: '2025-01-15T16:15:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB234JKL56',
      fileName: 'Invoice_Template.pdf',
      customer: 'Vikram Patel',
      phone: '+91 65432 10987',
      pages: 2,
      copies: 10,
      colorMode: 'bw',
      amount: 40,
      status: 'completed',
      timeReceived: '2025-01-15T15:45:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB567MNO89',
      fileName: 'Wedding_Invitations.pdf',
      customer: 'Meera Reddy',
      phone: '+91 54321 09876',
      pages: 1,
      copies: 100,
      colorMode: 'color',
      amount: 800,
      status: 'queued',
      timeReceived: '2025-01-15T16:50:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB890PQR12',
      fileName: 'Study_Notes.pdf',
      customer: 'Arjun Nair',
      phone: '+91 43210 98765',
      pages: 45,
      copies: 1,
      colorMode: 'bw',
      amount: 90,
      status: 'queued',
      timeReceived: '2025-01-15T16:55:00',
      paymentStatus: 'paid'
    },
    {
      id: 'PB345STU67',
      fileName: 'Business_Proposal.docx',
      customer: 'Kavya Iyer',
      phone: '+91 32109 87654',
      pages: 18,
      copies: 5,
      colorMode: 'bw',
      amount: 180,
      status: 'completed',
      timeReceived: '2025-01-15T15:30:00',
      paymentStatus: 'paid'
    }
  ]);

  const [lastUpdate, setLastUpdate] = useState(new Date());

  const updateJobStatus = (jobId, newStatus) => {
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, status: newStatus } : job
    ));
  };

  const refreshJobs = () => {
    setLastUpdate(new Date());
    // In real app, this would fetch from backend
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'printing': return 'text-orange-600 bg-orange-100';
      case 'queued': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTimeAgo = (timeString) => {
    const now = new Date();
    const time = new Date(timeString);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
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
            <h1 className="text-3xl font-bold text-gray-900">Job Queue</h1>
            <p className="text-gray-600 mt-2">Manage and track all print jobs</p>
          </div>
          <button
            onClick={refreshJobs}
            className="flex items-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-600 transition-colors duration-200"
          >
            <RefreshCw className="h-5 w-5" />
            <span>Refresh</span>
          </button>
        </motion.div>

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {[
            { label: 'Queued', count: jobs.filter(j => j.status === 'queued').length, color: 'bg-gray-100 text-gray-800' },
            { label: 'Printing', count: jobs.filter(j => j.status === 'printing').length, color: 'bg-orange-100 text-orange-800' },
            { label: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: 'bg-green-100 text-green-800' },
            { label: 'Total Jobs', count: jobs.length, color: 'bg-lime-100 text-lime-800' }
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${stat.color}`}>
                  Active
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Jobs List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Job Queue</h2>
              <p className="text-sm text-gray-600">
                Last updated: {lastUpdate.toLocaleTimeString('en-IN')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="bg-lime-100 p-2 rounded-lg">
                          <FileText className="h-5 w-5 text-lime-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{job.fileName}</p>
                          <p className="text-sm text-gray-600">ID: {job.id}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {formatTime(job.timeReceived)} • {getTimeAgo(job.timeReceived)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{job.customer}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{job.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <p className="text-gray-900">{job.pages} pages • {job.copies} copies</p>
                        <p className="text-gray-600">
                          {job.colorMode === 'color' ? 'Color' : 'B&W'} • ₹{job.amount}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          job.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {job.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={job.status}
                        onChange={(e) => updateJobStatus(job.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border-none focus:ring-2 focus:ring-lime-500 ${getStatusColor(job.status)}`}
                      >
                        <option value="queued">Queued</option>
                        <option value="printing">Printing</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-lime-600 hover:text-lime-700 p-2 rounded-lg hover:bg-lime-50 transition-colors duration-200">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
};

export default JobQueue;