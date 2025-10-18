import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
// UploadPage removed — route will render HomePage as fallback
import PaymentPage from './pages/PaymentPage';
// Order pages removed
import PartnerLogin from './pages/partner/PartnerLogin';
import Dashboard from './pages/partner/Dashboard';
import JobQueue from './pages/partner/JobQueue';
import PrintHistory from './pages/partner/PrintHistory';
import PricingManager from './pages/partner/PricingManager';
import PrinterSettings from './pages/partner/PrinterSettings';
// import Analytics from './pages/partner/Analytics'; // temporarily disabled
import ShopProfile from './pages/partner/ShopProfile';
import OnboardingWizard from './pages/partner/OnboardingWizard';
import ApplyShopPage from './pages/ApplyShopPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          <Route path="/upload" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          <Route path="/payment" element={
            <>
              <Header />
              <PaymentPage />
              <Footer />
            </>
          } />
          <Route path="/order-status/:orderId" element={
            <>
              <Header />
                {/* Order status page removed */}
              <Footer />
            </>
          } />
          <Route path="/my-orders" element={
            <>
              <Header />
                {/* My Orders page removed */}
              <Footer />
            </>
          } />
          <Route path="/apply" element={
            <>
              <Header />
              <ApplyShopPage />
              <Footer />
            </>
          } />
          
          {/* Partner Routes */}
          <Route path="/partner-login" element={<PartnerLogin />} />
          <Route path="/partner/onboarding" element={<OnboardingWizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/job-queue" element={<JobQueue />} />
          <Route path="/print-history" element={<PrintHistory />} />
          <Route path="/pricing" element={<PricingManager />} />
          <Route path="/printers" element={<PrinterSettings />} />
          {/* <Route path="/analytics" element={<Analytics />} /> */}
          <Route path="/profile" element={<ShopProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;