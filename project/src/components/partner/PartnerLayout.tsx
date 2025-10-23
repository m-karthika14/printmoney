import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import logo from '../../../logo.png';
import { Link, useLocation } from 'react-router-dom';
import { 
  
  Home, 
  ClipboardList, 
  FileText,
  DollarSign, 
  Settings, 
  // BarChart3, 
  User, 
  Menu, 
  X,
  LogOut,
  Bell
} from 'lucide-react';

const PartnerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [shopData, setShopData] = useState({ name: '', shopId: '' });

  useEffect(() => {
    const fetchShop = async () => {
      // Sanitize any legacy values: if a 24-char hex Mongo ObjectId was stored in localStorage,
      // remove it so pages don't mistakenly use it as the canonical public shop id.
      try {
        const stored = localStorage.getItem('shop_id') || localStorage.getItem('shopId');
        const HEX24 = /^[a-fA-F0-9]{24}$/;
        if (stored && HEX24.test(stored)) {
          // remove legacy entries and related keys
          try { localStorage.removeItem('shop_id'); } catch {}
          try { localStorage.removeItem('shopId'); } catch {}
          try { localStorage.removeItem('shop_object_id'); } catch {}
          console.warn('[PartnerLayout] removed legacy Mongo ObjectId from localStorage.shop_id', stored);
          return; // don't attempt to fetch using an invalid id
        }

        const canonical = localStorage.getItem('shop_id') || localStorage.getItem('shopId');
        if (!canonical) return;
        try {
          const res = await apiFetch(`/api/shops/by-shop/${canonical}`);
          if (res.ok) {
            const shop = await res.json();
            setShopData({ name: shop.name || shop.shopName || '', shopId: shop.shop_id || shop.shopId || '' });
          } else {
            // Fallback: some clients still store Mongo _id in localStorage.shop_object_id.
            // If lookup by public code failed, try resolving by the stored Mongo _id and persist canonical shop_id.
            const storedObj = localStorage.getItem('shop_object_id');
            if (storedObj && HEX24.test(storedObj)) {
              try {
                const r2 = await apiFetch(`/api/shops/${storedObj}`);
                if (r2.ok) {
                  const shop2 = await r2.json();
                  const cid = shop2.shop_id || shop2.shopId || '';
                  if (cid && !HEX24.test(cid)) {
                    try { localStorage.setItem('shop_id', cid); } catch {}
                    try { localStorage.removeItem('shopId'); } catch {}
                    setShopData({ name: shop2.shopName || shop2.name || '', shopId: cid });
                    console.log('[PartnerLayout] resolved canonical shop_id from _id and persisted:', cid);
                  }
                }
              } catch (e) {
                // ignore fallback errors
              }
            }
          }
        } catch (err) {
          // handle error
        }
      } catch (e) {
        // defensive: ignore localStorage access errors
      }
    };
    fetchShop();
  }, []);

  const handleSignOut = () => {
    // Clear known auth/shop tokens and redirect to login
    try {
      localStorage.removeItem('shop_id');
      localStorage.removeItem('shopId');
      localStorage.removeItem('auth_token');
    } catch (e) {
      // ignore
    }
    window.location.href = '/partner-login';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Job Queue', href: '/job-queue', icon: ClipboardList },
    { name: 'Print History', href: '/print-history', icon: FileText },
    { name: 'Pricing', href: '/pricing', icon: DollarSign },
    { name: 'Printers', href: '/printers', icon: Settings },
    // { name: 'Analytics', href: '/analytics', icon: BarChart3 }, // hidden
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-28 px-6 bg-slate-800">
          <Link to="/dashboard" className="flex items-center">
            <img
              src={logo}
              alt="logo"
              className="h-20 w-auto object-contain"
              style={{ transform: 'scale(2.25)', transformOrigin: 'left center' }}
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
        
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-lime-500 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-700">
            <button onClick={handleSignOut} className="group flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200">
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center space-x-4">
              <button className="relative text-gray-500 hover:text-gray-700">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{shopData.name || 'Shop Name'}</p>
                  <p className="text-xs text-gray-500">ID: {shopData.shopId.split(' • ')[0] || 'Loading...'}</p>
                </div>
                <div className="h-10 w-10 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">{shopData.name ? shopData.name.charAt(0).toUpperCase() : 'S'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;