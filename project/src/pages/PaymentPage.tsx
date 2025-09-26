import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Gift, QrCode, CheckCircle, MapPin, Clock } from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Check if this is from onboarding
  const isOnboarding = location.state?.returnTo === '/partner-onboarding';
  const planData = location.state?.plan;
  const shopId = location.state?.shopId;

  const orderDetails = {
    fileName: planData ? `${planData.name} Plan` : 'Resume_Final.pdf',
    pages: planData ? 1 : 10,
    copies: planData ? 1 : 2,
    colorMode: planData ? 'Plan Subscription' : 'Black & White',
    total: planData ? planData.price : 32,
    discount: 0
  };

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
    { id: 'upi', name: 'UPI Payment', icon: Smartphone },
  ];

  const handleCouponApply = () => {
    if (couponCode.toLowerCase() === 'first10') {
      setAppliedCoupon({ code: 'FIRST10', discount: 10 });
    } else if (couponCode.toLowerCase() === 'save20') {
      setAppliedCoupon({ code: 'SAVE20', discount: 20 });
    } else {
      alert('Invalid coupon code');
    }
  };

  const finalAmount = orderDetails.total - (appliedCoupon?.discount || 0);

  const handlePayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      if (isOnboarding) {
        // Return to onboarding with payment success
        const txnId = 'txn_' + Math.random().toString(36).substr(2, 9);
        navigate('/partner-onboarding?paymentStatus=success&txnId=' + txnId);
      } else {
        const orderId = 'PB' + Math.random().toString(36).substr(2, 8).toUpperCase();
        navigate(`/order-status/${orderId}`);
      }
    }, 2000);
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
          {isOnboarding ? (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Complete Plan Payment
              </h1>
              <p className="text-lg text-gray-600">
                Activate your {planData?.name} plan to continue setup
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Complete Your Payment
              </h1>
              <p className="text-lg text-gray-600">
                Review your order and choose your preferred payment method
              </p>
            </>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Payment Method</h2>
              
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      paymentMethod === method.id
                        ? 'border-lime-500 bg-lime-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <method.icon className="h-6 w-6 text-lime-500" />
                      <span className="font-medium text-slate-800">{method.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  </div>
                </motion.div>
              )}

              {/* UPI Form */}
              {paymentMethod === 'upi' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  <div className="bg-lime-50 rounded-xl p-6 text-center">
                    <QrCode className="h-24 w-24 text-lime-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      Scan QR Code
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Use any UPI app to scan and pay
                    </p>
                    <div className="bg-white rounded-lg px-4 py-2 inline-block">
                      <span className="font-mono text-sm text-gray-800">
                        printbeka@paytm
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Coupon Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <Gift className="h-6 w-6 text-lime-500" />
                <h2 className="text-xl font-semibold text-slate-800">Apply Coupon</h2>
              </div>
              
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                />
                <button
                  onClick={handleCouponApply}
                  className="px-6 py-3 bg-lime-500 text-white font-semibold rounded-lg hover:bg-lime-600 transition-colors duration-200"
                >
                  Apply
                </button>
              </div>
              
              {appliedCoupon && (
                <div className="mt-4 flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">
                    Coupon {appliedCoupon.code} applied! You saved ₹{appliedCoupon.discount}
                  </span>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-600">
                <p>Available coupons: FIRST10, SAVE20</p>
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6 sticky top-24"
            >
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">{orderDetails.fileName}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{orderDetails.pages} pages • {orderDetails.copies} copies</p>
                    <p>{orderDetails.colorMode}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{orderDetails.total}</span>
                  </div>
                  
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon.code}):</span>
                      <span className="font-medium">-₹{appliedCoupon.discount}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-semibold text-slate-800 pt-2 border-t">
                    <span>Total:</span>
                    <span>₹{finalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-lime-500" />
                  <span>Print Shop: Raj Digital Center</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-lime-500" />
                  <span>Ready in ~15 minutes</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                className="w-full mt-6 bg-gradient-to-r from-lime-500 to-emerald-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Pay ₹{finalAmount}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secured by 256-bit SSL encryption
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;