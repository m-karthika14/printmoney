import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ApplyShopPage: React.FC = () => {
  const [form, setForm] = useState({
    shopName: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed');
      }
      navigate('/partner/onboarding');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Gradient Header */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-4xl font-bold mb-2"
          >
            Apply to <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">PrintBeka</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-gray-200"
          >
            Register your shop and join our partner network
          </motion.p>
        </div>
      </section>

      {/* Registration Card */}
      <section className="flex-1 flex items-center justify-center py-12">
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100"
        >
          <div className="space-y-5">
            <input
              name="shopName"
              value={form.shopName}
              onChange={handleChange}
              placeholder="Shop Name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium"
            />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium"
            />
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium"
            />
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium"
            />
            {error && <div className="text-red-500 text-sm text-center font-semibold">{error}</div>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 text-white py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              Register
            </button>
          </div>
        </motion.form>
      </section>
    </div>
  );
};

export default ApplyShopPage;
