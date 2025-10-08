import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, Mail, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';

const PartnerLogin = () => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    otp: ''
  });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/shops/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Login failed');
        setLoading(false);
        return;
      }
      // Login successful, redirect to dashboard
      localStorage.setItem('registeredShopEmail', data.shop.email);
      localStorage.setItem('shopId', data.shop._id);
      console.log('Set shopId:', data.shop._id);
      navigate('/dashboard');
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="bg-lime-500 p-3 rounded-xl">
              <Printer className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">PrintBeka</span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Partner Login</h2>
          <p className="text-gray-300">Access your print shop dashboard</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
        >
          {/* Login Method Toggle */}
          <div className="flex rounded-lg bg-white/10 p-1 mb-6">
            <button
              onClick={() => setLoginMethod('email')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                loginMethod === 'email'
                  ? 'bg-lime-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </button>
            <button
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md font-medium transition-all duration-200 ${
                loginMethod === 'phone'
                  ? 'bg-lime-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Phone OTP</span>
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {loginMethod === 'email' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    OTP
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent text-center"
                      placeholder="123456"
                    />
                    <button
                      type="button"
                      className="px-4 py-3 bg-lime-500/20 border border-lime-500/50 text-lime-400 rounded-lg hover:bg-lime-500/30 transition-colors duration-200"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-lime-500 focus:ring-lime-500" />
                <span className="ml-2 text-sm text-gray-300">Remember me</span>
              </label>
              <a href="#" className="text-sm text-lime-400 hover:text-lime-300">
                Forgot password?
              </a>
            </div>

            {loginError && (
              <div className="text-red-400 text-sm font-semibold text-center mb-2">{loginError}</div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-lime-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              New partner?{' '}
              <Link to="/apply" className="text-lime-400 hover:text-lime-300 font-medium">
                Apply to join PrintBeka
              </Link>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-300 text-sm transition-colors duration-200"
          >
            ← Back to PrintBeka
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default PartnerLogin;