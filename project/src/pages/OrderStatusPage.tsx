import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Printer, Package, MapPin, Phone, Download, QrCode } from 'lucide-react';

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const [currentStatus, setCurrentStatus] = useState(0);

  const statusSteps = [
    { 
      id: 'queued', 
      title: 'Order Received', 
      description: 'Your order is in queue',
      icon: Clock,
      time: '2 min ago'
    },
    { 
      id: 'printing', 
      title: 'Printing Started', 
      description: 'Your document is being printed',
      icon: Printer,
      time: '1 min ago'
    },
    { 
      id: 'ready', 
      title: 'Ready for Pickup', 
      description: 'Your prints are ready!',
      icon: Package,
      time: 'Just now'
    }
  ];

  useEffect(() => {
    // Simulate status progression
    const timer1 = setTimeout(() => setCurrentStatus(1), 3000);
    const timer2 = setTimeout(() => setCurrentStatus(2), 6000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const shopDetails = {
    name: 'Raj Digital Center',
    address: '123 MG Road, Bangalore, Karnataka 560001',
    phone: '+91 98765 43210',
    coordinates: { lat: 12.9716, lng: 77.5946 }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Order Status
          </h1>
          <p className="text-lg text-gray-600">
            Order ID: <span className="font-mono font-semibold text-lime-600">{orderId}</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Print Status</h2>
              
              <div className="space-y-6">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStatus;
                  const isCurrent = index === currentStatus;
                  
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative flex items-center space-x-4"
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          isCompleted ? 'text-slate-800' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </h3>
                        <p className={`text-sm ${
                          isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                      
                      {isCompleted && (
                        <div className="text-sm text-gray-500">
                          {step.time}
                        </div>
                      )}
                      
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-6 top-12 w-0.5 h-6 ${
                          index < currentStatus ? 'bg-lime-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {currentStatus === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Your prints are ready!</h3>
                      <p className="text-green-700 text-sm">Please visit the shop to collect your order.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Shop Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <MapPin className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-slate-800">Shop Location</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800">{shopDetails.name}</h3>
                  <p className="text-gray-600">{shopDetails.address}</p>
                </div>
                
                <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Interactive map would be here</p>
                    <p className="text-sm text-gray-400">Google Maps integration</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-lime-500" />
                    <span className="text-gray-700">{shopDetails.phone}</span>
                  </div>
                  <button className="bg-lime-500 text-white px-4 py-2 rounded-lg hover:bg-lime-600 transition-colors duration-200">
                    Call Shop
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Order Details & Actions */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Order Details</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800">Resume_Final.pdf</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    <p>10 pages • 2 copies</p>
                    <p>Black & White • A4</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₹32</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 text-green-600">
                    <span>Discount:</span>
                    <span>-₹10</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total Paid:</span>
                    <span>₹22</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Download Receipt</span>
                </button>
                
                <button className="w-full border-2 border-lime-500 text-lime-600 px-6 py-3 rounded-xl font-semibold hover:bg-lime-50 transition-all duration-300 flex items-center justify-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>Show QR Code</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Need help? <button className="text-lime-600 hover:text-lime-700 font-medium">Contact Support</button>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;