import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Printer,
  Activity,
  Zap,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Wifi,
  BarChart3,
  RefreshCw,
  Clock
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: Wifi,
      title: 'Auto Printer Detection',
      description: 'Seamlessly connect and detect printers on your network automatically'
    },
    {
      icon: Activity,
      title: 'Real-time Job Tracking',
      description: 'Monitor every print job with live status updates and progress tracking'
    },
    {
      icon: TrendingUp,
      title: 'Revenue Analytics',
      description: 'Track earnings, print volumes, and business insights in real-time'
    },
    {
      icon: Zap,
      title: 'One-click Sync',
      description: 'Instant synchronization across all devices and printers'
    }
  ];

  const steps = [
    {
      icon: Wifi,
      title: 'Connect your printer',
      description: 'Auto-detect and connect in seconds'
    },
    {
      icon: Printer,
      title: 'Accept print jobs',
      description: 'Start receiving orders instantly'
    },
    {
      icon: BarChart3,
      title: 'Track revenue instantly',
      description: 'Real-time analytics dashboard'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-lime-200/30 to-emerald-200/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-200/30 to-lime-200/30 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left column - Text content */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-white">Manage Your</span>
                <br />
                <span className="text-white">Print Shop</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500">
                  Smarter
                </span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                Automate printing, track jobs, and grow your revenue — all in one place.
                Join the future of print shop management.
              </p>

              <div className="flex justify-center sm:justify-start pt-4">
                <Link to="/partner/login">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(132, 204, 22, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    className="group bg-gradient-to-r from-lime-500 to-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl flex items-center space-x-3 justify-center"
                  >
                    <span>Login to Dashboard</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Right column - Dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative"
            >
              {/* Main dashboard card */}
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
                {/* Glassmorphic overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm" />

                <div className="relative space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Dashboard</h3>
                    <div className="flex items-center space-x-2 bg-lime-100 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-lime-700">Live</span>
                    </div>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="bg-gradient-to-br from-lime-500 to-emerald-500 rounded-2xl p-4 text-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                          +12%
                        </span>
                      </div>
                      <div className="text-2xl font-bold">₹12,450</div>
                      <div className="text-xs text-lime-100">Today's Revenue</div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, delay: 0.5, repeat: Infinity }}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Printer className="h-5 w-5 text-gray-300" />
                        <RefreshCw className="h-3 w-3 text-gray-400 animate-spin" />
                      </div>
                      <div className="text-2xl font-bold text-white">24</div>
                      <div className="text-xs text-gray-300">Active Jobs</div>
                    </motion.div>
                  </div>

                  {/* Active jobs list */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-200">Recent Jobs</div>
                    {[1, 2, 3].map((item, index) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                            <Printer className="h-5 w-5 text-lime-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              Document_{item}.pdf
                            </div>
                            <div className="text-xs text-gray-300">
                              {item === 1 ? 'Printing...' : item === 2 ? 'In Queue' : 'Completed'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-gray-200">
                          ₹{30 + item * 10}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-white/20"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-lime-100 p-2 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-lime-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">New Order</div>
                    <div className="text-xs text-gray-300">Just now</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 bg-lime-100 px-4 py-2 rounded-full mb-6">
              <Zap className="h-4 w-4 text-lime-600" />
              <span className="text-sm font-medium text-lime-700">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500"> Grow</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Streamline your print shop operations with cutting-edge automation and insights
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{
                  y: -12,
                  scale: 1.02,
                  boxShadow: "0 25px 50px rgba(132, 204, 22, 0.2)"
                }}
                className="group bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-lime-400 transition-all duration-300 cursor-pointer"
              >
                <div className="bg-gradient-to-br from-lime-500 to-emerald-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-lime-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-lime-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full mb-6 border border-white/20">
              <Clock className="h-4 w-4 text-lime-400" />
              <span className="text-sm font-medium text-gray-200">Quick Setup</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Get Started in
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-500 to-emerald-500"> 3 Simple Steps</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              From setup to your first print job in under 5 minutes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines */}
            <div className="hidden md:block absolute top-20 left-1/4 right-1/4 h-0.5">
              <div className="relative h-full">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="absolute inset-0 bg-gradient-to-r from-lime-300 via-emerald-300 to-lime-300 origin-left"
                />
              </div>
            </div>

            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {index + 1}
                  </div>

                  <div className="bg-gradient-to-br from-lime-100 to-emerald-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <step.icon className="h-10 w-10 text-lime-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed flex-grow">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-lime-500/10 to-emerald-500/10" />

        {/* Animated blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-lime-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
          }}
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white">
              Ready to Transform Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">
                Print Business?
              </span>
            </h2>

            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Start managing your print shop smarter today. No credit card required.
            </p>

            <div className="flex justify-center pt-4">
              <Link to="/partner/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 50px rgba(132, 204, 22, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="group bg-gradient-to-r from-lime-500 to-emerald-500 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center space-x-3 justify-center"
                >
                  <span>Login to Dashboard</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </div>

            <div className="pt-8 flex items-center justify-center space-x-8 text-gray-400 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-lime-400" />
                <span>Free Setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-lime-400" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-lime-400" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;