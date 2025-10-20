import React, { useState } from 'react';
import { Check, CreditCard, Download, Printer, DollarSign, Settings, FileText, ArrowRight, Plus, X, Edit3, Building2, CreditCard as CardIcon, Eye, EyeOff } from 'lucide-react';
// import upiLogo from '../../assets/upi-logo.png'; // Removed: file does not exist
import { apiFetch } from '../../lib/api';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended?: boolean;
}

interface PrinterCapability {
  type: string;
  duplex: boolean;
  paperSizes: string[];
}

interface PrinterOverride {
  name?: string;
  model?: string;
  capabilities?: PrinterCapability[];
  notes?: string;
}

interface Service {
  id: string;
  name: string;
  selected: boolean;
  price: string;
}

interface CustomService {
  id: string;
  name: string;
  price: string;
}

const OnboardingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Step 1: Plan & Payment
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  // Removed unused: const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  // Store both shopId (public) and _id (MongoDB) for backend updates
  const [shopId, setShopId] = useState<string | null>(null);
  const [mongoId, setMongoId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Step 2: Agent Installation
  const [agentInstalled, setAgentInstalled] = useState(false);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentSuccess, setAgentSuccess] = useState(false);
  
  // Step 3: Printer Detection
  const [detectedPrinters] = useState<{ id: string; name: string; model: string; capabilities: string[] }[]>([]);
  const [printerOverrides, setPrinterOverrides] = useState<Record<string, PrinterOverride>>({});
  const [editingPrinter, setEditingPrinter] = useState<string | null>(null);
  
  // Step 4: Pricing
  const [pricing, setPricing] = useState({
    bwSingle: '',
    colorSingle: '',
    bwDouble: '',
    colorDouble: ''
  });
  
  // Step 5: Services
  const [services, setServices] = useState<Service[]>([
    { id: '1', name: 'Black & White Photocopy', selected: false, price: '' },
    { id: '2', name: 'Color Photocopy', selected: false, price: '' },
    { id: '3', name: 'Photo Printing (Passport Size)', selected: false, price: '' },
    { id: '4', name: 'Photo Printing (Postcard Size)', selected: false, price: '' },
    { id: '5', name: 'Document Scanning', selected: false, price: '' },
    { id: '6', name: 'Photo Scanning', selected: false, price: '' },
    { id: '7', name: 'ID Card Scanning', selected: false, price: '' },
    { id: '8', name: 'Email & Fax Service', selected: false, price: '' },
    { id: '9', name: 'Spiral Binding', selected: false, price: '' },
    { id: '10', name: 'Thermal Binding', selected: false, price: '' },
    { id: '11', name: 'Wiro Binding', selected: false, price: '' },
    { id: '12', name: 'Hard Binding', selected: false, price: '' },
    { id: '13', name: 'Lamination (Card)', selected: false, price: '' },
    { id: '14', name: 'Lamination (A4)', selected: false, price: '' },
    { id: '15', name: 'Lamination (A3)', selected: false, price: '' },
    { id: '16', name: 'Foam Board Mounting', selected: false, price: '' }
  ]);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);

  const pricingPlans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: '29',
      period: '/month',
      features: ['Up to 1,000 prints/month', 'Basic support', '2 printer connections', 'Standard services']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '79',
      period: '/month',
      features: ['Up to 10,000 prints/month', 'Priority support', '10 printer connections', 'All services', 'Custom branding'],
      recommended: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '199',
      period: '/month',
      features: ['Unlimited prints', '24/7 support', 'Unlimited printers', 'All services', 'Custom branding', 'API access']
    }
  ];

  // Removed unused: paymentMethods

  const steps = [
    { id: 1, title: 'Plan & Payment', icon: CreditCard },
    { id: 2, title: 'Agent Installation', icon: Download },
    { id: 3, title: 'Printer Detection', icon: Printer },
    { id: 4, title: 'Set Pricing', icon: DollarSign },
    { id: 5, title: 'Select Services', icon: Settings },
    { id: 6, title: 'Review & Complete', icon: FileText }
  ];

  // Remove generateCredentials, will fetch from backend

  const processPayment = async () => {
    if (!selectedPlan || !selectedPaymentMethod) return;
    setShopLoading(true);
    setShopError(null);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Fetch shopId and apiKey from backend using email stored in localStorage
      const email = localStorage.getItem('registeredShopEmail');
      if (!email) throw new Error('No registered shop email found.');
  const res = await apiFetch(`/api/shops`);
      if (!res.ok) throw new Error('Failed to fetch shop data');
      const shops = await res.json();
  const shop = shops.find((s: any) => s.email === email);
  if (!shop) throw new Error('Shop not found');
  setShopId(shop.shopId);
  setApiKey(shop.apiKey);
  setMongoId(shop._id); // Store MongoDB _id for backend PATCH
  setShowCredentialsModal(true);
    } catch (err: any) {
      setShopError(err.message || 'Failed to fetch shop credentials');
    } finally {
      setShopLoading(false);
    }
  };

  const closeCredentialsModal = () => {
    setShowCredentialsModal(false);
    nextStep();
  };

  // PATCH plan to backend
  const patchPlan = async () => {
    if (!mongoId || !selectedPlan) return;
    const planObj = pricingPlans.find(p => p.id === selectedPlan);
    if (!planObj) return;
    await apiFetch(`/api/shops/${mongoId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: {
          id: planObj.id,
          name: planObj.name,
          price: planObj.price,
          features: planObj.features
        }
      })
    });
  };

  // PATCH payment to backend
  const patchPayment = async (upiIdValue?: string) => {
    if (!mongoId || !selectedPaymentMethod) return;
    await apiFetch(`/api/shops/${mongoId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: selectedPaymentMethod,
        details: { upiId: upiIdValue || '' },
        status: 'pending',
        completed: false
      })
    });
  };

  // ...existing code...

  // PATCH services to backend
  const patchServices = async () => {
    if (!mongoId) return;
    const allServices = [
      ...services.filter(s => s.selected),
      ...customServices.map(s => ({ ...s, selected: true, isCustom: true }))
    ];
    await apiFetch(`/api/shops/${mongoId}/services`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: allServices })
    });
  };

  // Call PATCH after each step
  // PATCH printers to backend with correct schema after agent install
  const patchPrinters = async () => {
    if (!mongoId) {
      console.log('patchPrinters: mongoId is missing');
      return;
    }
    // Only update agentDetected values for existing printers, prevent dummies and samples
    let currentPrinters: any[] = [];
    try {
  const res = await apiFetch(`/api/shops/${mongoId}/printers`);
      if (res.ok) {
        const data = await res.json();
        currentPrinters = Array.isArray(data.printers) ? data.printers : [];
      }
    } catch {}

    // Only use agent-detected printers (no samples/dummies)
    const realPrinters = detectedPrinters.filter(printer => printer.id !== 'dummy' && printer.name.toLowerCase() !== 'dummy' && printer.name !== 'HP LaserJet Pro' && printer.name !== 'Canon PIXMA');

    // Deduplicate by agentDetected.name
    const uniquePrintersMap = new Map<string, typeof realPrinters[0]>();
    realPrinters.forEach(printer => {
      uniquePrintersMap.set(printer.name, printer);
    });
    const uniquePrinters = Array.from(uniquePrintersMap.values());

    const updatedPrinters: any[] = [];
    uniquePrinters.forEach(printer => {
      let existing = currentPrinters.find(p => p.agentDetected && p.agentDetected.name === printer.name);
      if (existing) {
        existing.agentDetected = {
          ...existing.agentDetected,
          name: printer.name,
          status: "Ready",
          capabilities: [
            {
              type: printer.capabilities.includes("Color") ? "Color" : "B/W",
              duplex: printer.capabilities.includes("Duplex"),
              paperSizes: ["A4", "Letter"]
            }
          ]
        };
        updatedPrinters.push(existing);
      } else {
        updatedPrinters.push({
          agentDetected: {
            name: printer.name,
            status: "Ready",
            capabilities: [
              {
                type: printer.capabilities.includes("Color") ? "Color" : "B/W",
                duplex: printer.capabilities.includes("Duplex"),
                paperSizes: ["A4", "Letter"]
              }
            ]
          },
          manualOverride: printerOverrides[printer.id] || {
            name: "",
            notes: "",
            capabilities: []
          },
          useAgentValues: true
        });
      }
    });
    // Only one entry per agent-detected printer
    console.log('patchPrinters: sending printers array:', updatedPrinters);
    try {
      const response = await apiFetch(`/api/shops/${mongoId}/printers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printers: updatedPrinters })
      });
      const result = await response.json();
      console.log('patchPrinters: backend response:', result);
    } catch (err) {
      console.error('patchPrinters: error sending printers:', err);
    }
  };

  // PATCH pricing to backend
  const patchPricing = async () => {
    if (!mongoId) return;
    try {
  const response = await apiFetch(`/api/shops/shop/${mongoId}/pricing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing })
      });
      const result = await response.json();
      console.log('patchPricing: backend response:', result);
    } catch (err) {
      console.error('patchPricing: error sending pricing:', err);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      await patchPlan();
      await patchPayment();
    }
    if (currentStep === 2) {
      // After agent install, PATCH printers with correct schema
      await patchPrinters();
    }
    if (currentStep === 3) {
      await patchPrinters();
    }
    if (currentStep === 4) {
      await patchPricing();
    }
    if (currentStep === 5) {
      await patchServices();
    }
    if (currentStep < 6) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const completeOnboarding = async () => {
  // Simulate saving to database
  await new Promise(resolve => setTimeout(resolve, 1500));
  // Redirect to partner login page
  window.location.href = '/partner-login';
  };

  const updatePrinterOverride = (printerId: string, field: string, value: any) => {
    setPrinterOverrides(prev => {
      let newValue = value;
      if (field === 'capabilities') {
        // If value is an array of strings, convert to array of objects
        if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
          newValue = [{
            type: value[0] || "B/W",
            duplex: false,
            paperSizes: ["A4", "Letter"]
          }];
        }
        // If value is not an array of objects, default to one object
        if (!Array.isArray(newValue) || typeof newValue[0] !== 'object') {
          newValue = [{ type: "B/W", duplex: false, paperSizes: ["A4", "Letter"] }];
        }
      }
      return {
        ...prev,
        [printerId]: {
          ...prev[printerId],
          [field]: newValue
        }
      };
    });
  };

  const toggleService = (serviceId: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId ? { ...service, selected: !service.selected } : service
    ));
  };

  const updateServicePrice = (serviceId: string, price: string) => {
    setServices(prev => prev.map(service => 
      service.id === serviceId ? { ...service, price } : service
    ));
  };

  const addCustomService = () => {
    const newId = Date.now().toString();
    setCustomServices(prev => [...prev, { id: newId, name: '', price: '' }]);
  };

  const updateCustomService = (id: string, field: string, value: string) => {
    setCustomServices(prev => prev.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
  };

  const removeCustomService = (id: string) => {
    setCustomServices(prev => prev.filter(service => service.id !== id));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-16">
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const StepIcon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                  isCompleted 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white transform scale-110' 
                    : isCurrent 
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-white transform scale-110 shadow-lime-200' 
                      : 'bg-white text-gray-400 border-2 border-gray-200'
                }`}>
                  {isCompleted ? <Check className="w-7 h-7" /> : <StepIcon className="w-7 h-7" />}
                </div>
                <span className={`mt-3 text-sm font-semibold transition-colors duration-300 ${
                  isCompleted ? 'text-green-600' : isCurrent ? 'text-lime-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-20 h-1 mx-4 rounded-full transition-all duration-500 self-center ${
                  isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : isCurrent ? 'bg-gradient-to-r from-lime-400 to-lime-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-600">Select the plan that best fits your printing needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingPlans.map((plan) => (
          <div key={plan.id} className={`relative bg-white rounded-2xl border-2 p-8 transition-all duration-300 hover:shadow-2xl cursor-pointer transform hover:-translate-y-2 ${
            selectedPlan === plan.id ? 'border-lime-500 shadow-2xl shadow-lime-100 scale-105' : 'border-gray-200 hover:border-lime-300'
          }`}
          onClick={() => setSelectedPlan(plan.id)}>
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-lime-400 to-lime-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>
            )}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gray-900">₹{plan.price}</span>
                <span className="text-xl text-gray-500">{plan.period}</span>
              </div>
            </div>
            <ul className="mt-8 space-y-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="w-6 h-6 text-green-500 mr-4 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select Payment Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* UPI Card */}
            <div
              className={`bg-white border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center hover:shadow-lg ${
                selectedPaymentMethod === 'upi' ? 'border-lime-500 ring-2 ring-lime-300 scale-105' : 'border-gray-200 hover:border-lime-400'
              }`}
              onClick={() => setSelectedPaymentMethod('upi')}
            >
              <span className="w-10 h-10 mb-2 flex items-center justify-center bg-lime-100 rounded-full"><CreditCard className="w-6 h-6 text-lime-500" /></span>
              <h4 className="font-semibold text-gray-900">UPI</h4>
              <p className="text-sm text-gray-500 text-center">Pay using UPI apps (Google Pay, PhonePe, Paytm)</p>
            </div>
            {/* Net Banking Card */}
            <div
              className={`bg-white border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center hover:shadow-lg ${
                selectedPaymentMethod === 'netbanking' ? 'border-lime-500 ring-2 ring-lime-300 scale-105' : 'border-gray-200 hover:border-lime-500'
              }`}
              onClick={() => setSelectedPaymentMethod('netbanking')}
            >
              <Building2 className="w-10 h-10 mb-2 text-lime-500" />
              <h4 className="font-semibold text-gray-900">Net Banking</h4>
              <p className="text-sm text-gray-500 text-center">Pay using your bank account</p>
            </div>
            {/* Card Payment Card */}
            <div
              className={`bg-white border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center hover:shadow-lg ${
                selectedPaymentMethod === 'card' ? 'border-lime-500 ring-2 ring-lime-300 scale-105' : 'border-gray-200 hover:border-lime-400'
              }`}
              onClick={() => setSelectedPaymentMethod('card')}
            >
              <CardIcon className="w-10 h-10 mb-2 text-lime-500" />
              <h4 className="font-semibold text-gray-900">Credit/Debit Card</h4>
              <p className="text-sm text-gray-500 text-center">Pay using your card</p>
            </div>
          </div>

          {/* Payment Method Details */}
          {selectedPaymentMethod === 'upi' && (
            <div className="bg-white border-2 border-lime-200 rounded-xl p-6 mb-8 animate-fadeIn">
              <h4 className="text-lg font-bold mb-4 flex items-center"><CreditCard className="w-6 h-6 mr-2 text-lime-500" /> UPI Payment</h4>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">Enter UPI ID (VPA)</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium mb-4" placeholder="yourname@upi" />
                  <button className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 text-white py-2 rounded-xl font-semibold mb-2">Pay via UPI ID</button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <label className="block text-sm font-semibold mb-2">Scan QR Code</label>
                  <div className="w-32 h-32 bg-gray-200 rounded-xl flex items-center justify-center mb-2">QR</div>
                  <button className="w-full bg-gradient-to-r from-lime-400 to-emerald-400 text-white py-2 rounded-xl font-semibold">Pay via App</button>
                </div>
              </div>
            </div>
          )}
          {selectedPaymentMethod === 'netbanking' && (
            <div className="bg-white border-2 border-lime-200 rounded-xl p-6 mb-8 animate-fadeIn">
              <h4 className="text-lg font-bold mb-4 flex items-center"><Building2 className="w-6 h-6 mr-2 text-lime-500" /> Net Banking</h4>
              <label className="block text-sm font-semibold mb-2">Select Your Bank</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium mb-4" placeholder="Search bank..." />
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-medium">
                <option>State Bank of India</option>
                <option>HDFC Bank</option>
                <option>ICICI Bank</option>
                <option>Axis Bank</option>
                <option>Kotak Mahindra Bank</option>
                <option>Punjab National Bank</option>
                <option>Bank of Baroda</option>
                <option>Canara Bank</option>
                <option>Union Bank of India</option>
                <option>Other...</option>
              </select>
              <button className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-lime-600 text-white py-2 rounded-xl font-semibold">Proceed to Bank</button>
            </div>
          )}
          {selectedPaymentMethod === 'card' && (
            <div className="bg-white border-2 border-lime-200 rounded-xl p-6 mb-8 animate-fadeIn">
              <h4 className="text-lg font-bold mb-4 flex items-center"><CardIcon className="w-6 h-6 mr-2 text-lime-500" /> Credit/Debit Card</h4>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Card Number</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium" placeholder="1234 5678 9012 3456" maxLength={19} />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2">Expiry</label>
                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium" placeholder="MM/YY" maxLength={5} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold mb-2">CVV</label>
                    <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium" placeholder="123" maxLength={4} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Cardholder Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-lime-400 focus:outline-none text-slate-800 bg-gray-50 font-medium" placeholder="Your Name" />
                </div>
                <button className="w-full bg-gradient-to-r from-emerald-500 to-lime-500 text-white py-2 rounded-xl font-semibold">Pay Securely</button>
              </form>
            </div>
          )}

          {selectedPaymentMethod && (
            <div className="text-center">
              <button 
                onClick={processPayment}
                className="bg-gradient-to-r from-emerald-500 to-lime-600 hover:from-emerald-600 hover:to-lime-700 text-white font-bold py-4 px-12 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Pay ₹{pricingPlans.find(p => p.id === selectedPlan)?.price} Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Payment Successful!</h3>
              <p className="text-gray-600 mt-2">Your credentials have been generated</p>
            </div>
            
            <div className="space-y-4">
              {shopLoading && (
                <div className="text-center text-blue-500 font-semibold">Loading credentials...</div>
              )}
              {shopError && (
                <div className="text-center text-red-500 font-semibold">{shopError}</div>
              )}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Shop ID</label>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <code className="text-sm font-mono text-gray-800">{shopId}</code>
                  <button 
                    onClick={() => shopId && navigator.clipboard.writeText(shopId)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">API Key</label>
                <div className="flex items-center justify-between bg-white p-3 rounded border">
                  <code className="text-sm font-mono text-gray-800">
                    {showApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => apiKey && navigator.clipboard.writeText(apiKey)}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <button 
                onClick={closeCredentialsModal}
                className="bg-gradient-to-r from-emerald-500 to-lime-600 hover:from-emerald-600 hover:to-lime-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300"
              >
                Continue Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const handleAgentInstall = async () => {
    setAgentLoading(true);
    setAgentError(null);
    setAgentSuccess(false);
    try {
      // Fetch shopId if not already set
      // Always use mongoId for PATCH
      let id = mongoId;
      if (!id) {
        // Fallback: fetch by email if not in state
        const email = localStorage.getItem('registeredShopEmail');
        if (!email) throw new Error('No registered shop email found.');
  const res = await apiFetch(`/api/shops`);
        if (!res.ok) throw new Error('Failed to fetch shop data');
        const shops = await res.json();
        const shop = shops.find((s: any) => s.email === email);
        if (!shop) throw new Error('Shop not found');
        id = shop._id;
        setMongoId(shop._id);
        setShopId(shop.shopId);
      }
      // PATCH agent status using MongoDB _id
      const res = await apiFetch(`/api/shops/${id}/agent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'installed', installedAt: new Date() })
      });
      if (!res.ok) throw new Error('Failed to update agent status');
      setAgentInstalled(true);
      setAgentSuccess(true);
      setTimeout(() => {
        setAgentSuccess(false);
        nextStep();
      }, 1200);
    } catch (err: any) {
      setAgentError(err.message || 'Agent installation failed. Please try again.');
    } finally {
      setAgentLoading(false);
    }
  };

  const renderStep2 = () => (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Install Print Agent</h2>
        <p className="text-xl text-gray-600">Download and install the local print agent to connect your printers</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center mb-6">
            <Download className="w-8 h-8 text-lime-500 mr-4" />
            <h3 className="text-2xl font-bold text-gray-900">Agent Installation Instructions</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-lime-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">1</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900">Download the Print Agent</p>
                <p className="text-gray-600 mb-4">Download the agent for your operating system</p>
                <button className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300">
                  Download for Windows
                </button>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-lime-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">2</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900">Install and Configure</p>
                <p className="text-gray-600">Run the installer and enter your Shop ID:</p>
                <div className="mt-2 bg-gray-100 p-3 rounded-lg">
                  <code className="text-lg font-mono text-lime-600">{shopId}</code>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-lime-500 text-white rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">3</div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-900">Verify Connection</p>
                <p className="text-gray-600">The agent will automatically detect and connect your printers</p>
              </div>
            </div>
          </div>

          {!agentInstalled && (
            <div className="mt-10 text-center">
              <button 
                onClick={handleAgentInstall}
                className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                disabled={agentLoading}
              >
                {agentLoading && (
                  <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                )}
                {agentLoading ? 'Installing…' : 'Install Agent'}
              </button>
              {agentError && <div className="mt-4 text-red-500 font-semibold">{agentError}</div>}
            </div>
          )}

          {agentSuccess && (
            <div className="mt-10 bg-lime-50 border-2 border-lime-200 rounded-xl p-6 text-center animate-fadeIn">
              <Check className="w-8 h-8 text-lime-500 mx-auto mb-3" />
              <p className="text-lime-800 font-bold text-lg">Agent installed successfully 🎉</p>
            </div>
          )}

          {agentInstalled && !agentSuccess && (
            <div className="mt-10 bg-lime-50 border-2 border-lime-200 rounded-xl p-6 text-center">
              <Check className="w-8 h-8 text-lime-500 mx-auto mb-3" />
              <p className="text-lime-800 font-bold text-lg">Agent installed successfully!</p>
              <button 
                onClick={nextStep}
                className="mt-6 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 inline-flex items-center"
              >
                Continue <ArrowRight className="w-6 h-6 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Printer Detection & Configuration</h2>
        <p className="text-xl text-gray-600">Review detected printers and configure manual overrides if needed</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {detectedPrinters.map((printer) => (
          <div key={printer.id} className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <Printer className="w-8 h-8 text-blue-500 mr-4" />
                <h3 className="text-2xl font-bold text-gray-900">{printer.name}</h3>
              </div>
              <span className="bg-lime-100 text-lime-800 px-4 py-2 rounded-full text-sm font-semibold">Connected</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Manual Override Card */}
              <div className="bg-lime-50 border-2 border-lime-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-lime-900">Manual Override</h4>
                  <button
                    onClick={() => setEditingPrinter(editingPrinter === printer.id ? null : printer.id)}
                    className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      editingPrinter === printer.id 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {editingPrinter === printer.id ? 'Cancel Edit' : 'Edit'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Printer Name</label>
                    <input
                      type="text"
                      placeholder={`Default: ${printer.name}`}
                      value={printerOverrides[printer.id]?.name || ''}
                      onChange={(e) => updatePrinterOverride(printer.id, 'name', e.target.value)}
                      disabled={editingPrinter !== printer.id}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-300 ${
                        editingPrinter === printer.id 
                          ? 'border-blue-300 focus:border-blue-500 bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      {printerOverrides[printer.id]?.name ? 'Using manual value' : 'Using agent-detected value'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Model</label>
                    <input
                      type="text"
                      placeholder={`Default: ${printer.model}`}
                      value={printerOverrides[printer.id]?.model || ''}
                      onChange={(e) => updatePrinterOverride(printer.id, 'model', e.target.value)}
                      disabled={editingPrinter !== printer.id}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all duration-300 ${
                        editingPrinter === printer.id 
                          ? 'border-blue-300 focus:border-blue-500 bg-white' 
                          : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      {printerOverrides[printer.id]?.model ? 'Using manual value' : 'Using agent-detected value'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-blue-800 mb-2">Capability Type</label>
                    <select
                      value={(() => {
                        const cap = printerOverrides[printer.id]?.capabilities?.[0];
                        return (cap && typeof cap === 'object' && 'type' in cap) ? cap.type : (printer.capabilities.includes("Color") ? "Color" : "B/W");
                      })()}
                      onChange={e => updatePrinterOverride(printer.id, 'capabilities', [{
                        type: e.target.value,
                        duplex: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'duplex' in cap) ? cap.duplex : printer.capabilities.includes("Duplex");
                        })(),
                        paperSizes: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'paperSizes' in cap) ? cap.paperSizes : ["A4", "Letter"];
                        })()
                      }])}
                      disabled={editingPrinter !== printer.id}
                      className={`w-full px-4 py-2 border-2 rounded-lg transition-all duration-300 ${editingPrinter === printer.id ? 'border-blue-300 focus:border-blue-500 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="B/W">B/W</option>
                      <option value="Color">Color</option>
                      <option value="Color+B/W">Color+B/W</option>
                    </select>
                    <label className="block text-sm font-semibold text-blue-800 mb-2 mt-2">Duplex</label>
                    <input
                      type="checkbox"
                      checked={(() => {
                        const cap = printerOverrides[printer.id]?.capabilities?.[0];
                        return (cap && typeof cap === 'object' && 'duplex' in cap) ? cap.duplex : printer.capabilities.includes("Duplex");
                      })()}
                      onChange={e => updatePrinterOverride(printer.id, 'capabilities', [{
                        type: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'type' in cap) ? cap.type : (printer.capabilities.includes("Color") ? "Color" : "B/W");
                        })(),
                        duplex: e.target.checked,
                        paperSizes: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'paperSizes' in cap) ? cap.paperSizes : ["A4", "Letter"];
                        })()
                      }])}
                      disabled={editingPrinter !== printer.id}
                      className="mr-2"
                    />
                    <span className="text-xs">Supports double-sided printing</span>
                    <label className="block text-sm font-semibold text-blue-800 mb-2 mt-2">Paper Sizes</label>
                    <input
                      type="text"
                      value={(() => {
                        const cap = printerOverrides[printer.id]?.capabilities?.[0];
                        return (cap && typeof cap === 'object' && 'paperSizes' in cap) ? cap.paperSizes.join(", ") : ["A4", "Letter"].join(", ");
                      })()}
                      onChange={e => updatePrinterOverride(printer.id, 'capabilities', [{
                        type: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'type' in cap) ? cap.type : (printer.capabilities.includes("Color") ? "Color" : "B/W");
                        })(),
                        duplex: (() => {
                          const cap = printerOverrides[printer.id]?.capabilities?.[0];
                          return (cap && typeof cap === 'object' && 'duplex' in cap) ? cap.duplex : printer.capabilities.includes("Duplex");
                        })(),
                        paperSizes: e.target.value.split(",").map(s => s.trim())
                      }])}
                      disabled={editingPrinter !== printer.id}
                      className={`w-full px-4 py-2 border-2 rounded-lg transition-all duration-300 ${editingPrinter === printer.id ? 'border-blue-300 focus:border-blue-500 bg-white' : 'border-gray-200 bg-gray-100 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="A4, Letter"
                    />
                  </div>
                </div>
              </div>

              {/* Agent Detected Card */}
              <div className="bg-lime-50 border-2 border-lime-200 rounded-xl p-6">
                <h4 className="text-xl font-bold text-lime-900 mb-6">Agent Detected Values</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-lime-800 mb-2">Printer Name</label>
                    <div className="w-full px-4 py-3 border-2 border-lime-200 bg-lime-100 rounded-lg text-lime-900 font-medium">
                      {printer.name}
                    </div>
                    <p className="text-xs text-lime-600 mt-1">Auto-detected by agent</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lime-800 mb-2">Model</label>
                    <div className="w-full px-4 py-3 border-2 border-lime-200 bg-lime-100 rounded-lg text-lime-900 font-medium">
                      {printer.model}
                    </div>
                    <p className="text-xs text-lime-600 mt-1">Auto-detected by agent</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lime-800 mb-2">Capability Type</label>
                    <div className="w-full px-4 py-3 border-2 border-lime-200 bg-lime-100 rounded-lg text-lime-900 font-medium">
                      {printer.capabilities.includes("Color") ? "Color" : "B/W"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lime-800 mb-2">Duplex</label>
                    <div className="w-full px-4 py-3 border-2 border-lime-200 bg-lime-100 rounded-lg text-lime-900 font-medium">
                      {printer.capabilities.includes("Duplex") ? "Yes" : "No"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-lime-800 mb-2">Paper Sizes</label>
                    <div className="w-full px-4 py-3 border-2 border-lime-200 bg-lime-100 rounded-lg text-lime-900 font-medium">
                      {"A4, Letter"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="text-center">
          <button 
            onClick={nextStep}
            className="mt-32 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-bold py-4 px-12 rounded-xl transition-all duration-300 inline-flex items-center transform hover:scale-105"
          >
            Continue <ArrowRight className="w-6 h-6 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Set Printing Prices</h2>
        <p className="text-xl text-gray-600">Configure your pricing for different print types</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white border-2 border-lime-200 rounded-2xl p-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                B&W Single Side (per page)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₹</span>
                <input
                  type="text"
                  value={pricing.bwSingle}
                  onChange={(e) => setPricing(prev => ({ ...prev, bwSingle: e.target.value }))}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-lg transition-all duration-300"
                  placeholder="2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Color Single Side (per page)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₹</span>
                <input
                  type="text"
                  value={pricing.colorSingle}
                  onChange={(e) => setPricing(prev => ({ ...prev, colorSingle: e.target.value }))}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-lg transition-all duration-300"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                B&W Double Side (per page)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₹</span>
                <input
                  type="text"
                  value={pricing.bwDouble}
                  onChange={(e) => setPricing(prev => ({ ...prev, bwDouble: e.target.value }))}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-lg transition-all duration-300"
                  placeholder="3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-lg font-bold text-gray-800 mb-3">
                Color Double Side (per page)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">₹</span>
                <input
                  type="text"
                  value={pricing.colorDouble}
                  onChange={(e) => setPricing(prev => ({ ...prev, colorDouble: e.target.value }))}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-lg transition-all duration-300"
                  placeholder="8"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button 
              onClick={nextStep}
              className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-600 text-white font-bold py-4 px-12 rounded-xl transition-all duration-300 inline-flex items-center transform hover:scale-105"
            >
              Continue <ArrowRight className="w-6 h-6 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Select Services</h2>
        <p className="text-xl text-gray-600">Choose the services you want to offer and set their prices</p>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {services.map((service) => (
            <div key={service.id} className={`bg-white border-2 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 ${
              service.selected ? 'border-lime-500 bg-lime-50 shadow-lg shadow-lime-100' : 'border-gray-200 hover:border-lime-300 hover:shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{service.name}</h3>
                <button
                  onClick={() => toggleService(service.id)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    service.selected 
                      ? 'bg-lime-500 border-lime-500 text-white transform scale-110' 
                      : 'border-gray-300 hover:border-lime-500'
                  }`}
                >
                  {service.selected && <Check className="w-5 h-5" />}
                </button>
              </div>
              
              {service.selected && (
                <div className="mt-4 animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="text"
                      value={service.price}
                      onChange={(e) => updateServicePrice(service.id, e.target.value)}
                      className="w-full pl-8 pr-3 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-300"
                      placeholder="10"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Custom Services</h3>
            <button
              onClick={addCustomService}
              className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Custom Service
            </button>
          </div>

          {customServices.length > 0 && (
            <div className="space-y-4">
              {customServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-xl">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => updateCustomService(service.id, 'name', e.target.value)}
                    placeholder="Service name"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-300"
                  />
                  <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="text"
                      value={service.price}
                      onChange={(e) => updateCustomService(service.id, 'price', e.target.value)}
                      placeholder="10"
                      className="w-full pl-8 pr-3 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-300"
                    />
                  </div>
                  <button
                    onClick={() => removeCustomService(service.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button 
            onClick={nextStep}
            className="mt-8 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-bold py-4 px-12 rounded-xl transition-all duration-300 inline-flex items-center transform hover:scale-105"
          >
            Continue <ArrowRight className="w-6 h-6 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const selectedServices = services.filter(s => s.selected);
    const selectedPlanDetails = pricingPlans.find(p => p.id === selectedPlan);
    
    return (
      <div className="space-y-10">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Review & Complete</h2>
          <p className="text-xl text-gray-600">Review your configuration and complete the onboarding process</p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="bg-white border-2 border-gray-200 rounded-2xl divide-y-2 divide-gray-100 shadow-lg">
            {/* Plan & Payment */}
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <CreditCard className="w-6 h-6 mr-3 text-lime-500" />
                Plan & Payment
              </h3>
              <div className="text-gray-700 space-y-2">
                <p className="text-lg">Selected Plan: <span className="font-bold text-lime-600">{selectedPlanDetails?.name}</span></p>
                <p className="text-lg">Price: <span className="font-bold">₹{selectedPlanDetails?.price}{selectedPlanDetails?.period}</span></p>
                <p className="text-lime-600 font-bold text-lg">✅ Payment Processed Successfully</p>
              </div>
            </div>

            {/* Credentials */}
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4">Shop Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-sm font-semibold text-gray-600">Shop ID:</span>
                  <code className="block bg-white p-3 rounded-lg mt-2 font-mono text-lg border">{shopId}</code>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <span className="text-sm font-semibold text-gray-600">API Key:</span>
                  <code className="block bg-white p-3 rounded-lg mt-2 font-mono text-lg border">{apiKey}</code>
                </div>
              </div>
            </div>

            {/* Printers */}
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Printer className="w-6 h-6 mr-3 text-lime-500" />
                Configured Printers
              </h3>
              <div className="space-y-3">
                {detectedPrinters.map((printer) => (
                  <div key={printer.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                    <span className="text-lg">
                      <span className="font-bold">
                        {printerOverrides[printer.id]?.name || printer.name}
                      </span>
                      <span className="text-gray-500 ml-3">
                        ({printerOverrides[printer.id]?.model || printer.model})
                      </span>
                    </span>
                    <span className="text-lime-600 font-bold">Connected</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <DollarSign className="w-6 h-6 mr-3 text-lime-500" />
                Print Pricing
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm font-semibold text-gray-600">B&W Single:</span>
                  <p className="text-xl font-bold text-lime-600">₹{pricing.bwSingle}/page</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm font-semibold text-gray-600">Color Single:</span>
                  <p className="text-xl font-bold text-lime-600">₹{pricing.colorSingle}/page</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm font-semibold text-gray-600">B&W Double:</span>
                  <p className="text-xl font-bold text-lime-600">₹{pricing.bwDouble}/page</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl text-center">
                  <span className="text-sm font-semibold text-gray-600">Color Double:</span>
                  <p className="text-xl font-bold text-lime-600">₹{pricing.colorDouble}/page</p>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-lime-500" />
                Selected Services ({selectedServices.length + customServices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="font-medium">{service.name}</span>
                    <span className="font-bold text-lime-600">₹{service.price}</span>
                  </div>
                ))}
                {customServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center bg-lime-50 p-4 rounded-xl border border-lime-200">
                    <span className="font-medium">{service.name} <span className="text-xs text-lime-600">(Custom)</span></span>
                    <span className="font-bold text-lime-600">₹{service.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={completeOnboarding}
              className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white font-bold py-5 px-16 rounded-2xl transition-all duration-300 text-xl transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Complete Onboarding
            </button>
            <p className="text-gray-500 mt-4 text-lg">
              You will be redirected to the login page after completion
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {renderStepIndicator()}
        <div className="transition-all duration-700 ease-in-out">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;