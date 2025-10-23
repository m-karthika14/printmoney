import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../lib/api';

const ApplyShopPage: React.FC = () => {
  const [form, setForm] = useState({
    shopName: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        // Try to parse JSON error body, fallback to text
        let msg = 'Registration failed';
        try {
          const data = await res.json();
          msg = data?.message || JSON.stringify(data);
        } catch (parseErr) {
          try {
            const text = await res.text();
            if (text) msg = text;
          } catch (_) {}
        }
        throw new Error(msg);
      }
  const data = await res.json();
  // Persist identifiers for onboarding
  const publicId = data?.shopId || data?.shop_id || null;
  const apiKey = data?.apiKey || data?.apikey || null;
      if (publicId) {
        try {
          const HEX24 = /^[a-fA-F0-9]{24}$/;
          if (!HEX24.test(publicId)) {
            localStorage.setItem('shopId', publicId);
            localStorage.setItem('shop_id', publicId);
          } else {
            // Don't store raw Mongo ObjectId as canonical public id
            localStorage.setItem('shop_object_id', publicId);
            console.warn('[ApplyShopPage] backend returned 24-char ObjectId as shop id; saved to shop_object_id instead');
          }
        } catch (e) {}
      }
  if (apiKey) localStorage.setItem('apiKey', apiKey);
  localStorage.setItem('registeredShopEmail', form.email);
      navigate('/partner/onboarding');
    } catch (err: any) {
      console.error('ApplyShop registration error:', err);
      setError(err?.message || 'Registration failed - network or server error');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center">
      <div className="max-w-6xl mx-auto w-full px-6 py-16">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="md:w-1/2 text-left"
          >
            <div className="flex flex-col items-start mt-24">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
                Apply to <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400 drop-shadow-[0_0_16px_rgba(16,185,129,0.7)]">EazePrint</span>
              </h1>
              <p className="text-xl md:text-2xl font-extrabold mb-4">
                <span className="text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Grow Your Print Business </span>
                <span className="text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">with us</span>
              </p>
              <p className="text-lg text-slate-600 mt-4">Register your shop and join our partner network</p>
            </div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit}
            className="md:w-1/2 bg-white/95 p-8 rounded-2xl shadow-2xl border border-gray-200 ring-1 ring-gray-100 relative z-10"
          >
            <div className="space-y-5">
              <input
                name="shopName"
                value={form.shopName}
                onChange={handleChange}
                placeholder="Shop Name"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-white font-medium"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-white font-medium"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-white font-medium"
              />
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-white font-medium"
              />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-white font-medium"
              />
              {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}
              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-lime-500 to-emerald-500 text-white py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
};

export default ApplyShopPage;
