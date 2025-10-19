import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../../logo.png';
import { motion } from 'framer-motion';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [{ name: 'Home', path: '/' }];

  return (
  <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 backdrop-blur-sm sticky top-0 z-50 relative">
  {/* no overlay — fully transparent header */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-20">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
                <img src={logo} alt="EazePrint" className="h-32 md:h-44 lg:h-56 w-auto object-contain" />
            </Link>
          </div>

          {/* Right: nav (desktop) + Partner login and mobile menu button */}
          <div className="flex items-center space-x-6">
            {/* Desktop nav moved here so Home sits next to Partner Login */}
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-base font-semibold text-lime-600 transition-colors duration-200`}
                  >
                    {item.name}
                  </Link>
                ))}
            </nav>

            {/* Partner Login pill - default white background, lime text; on hover background becomes green gradient while text stays the same */}
            <Link
              to="/partner-login"
              aria-label="Partner Login"
              className="hidden md:inline-flex items-center h-12 px-5 rounded-full bg-white text-lime-600 transition-colors duration-500 ease-in-out cursor-pointer whitespace-nowrap font-semibold hover:bg-gradient-to-r hover:from-lime-500 hover:to-emerald-500 hover:text-white"
            >
              Partner Login
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="md:hidden py-4 border-t border-white/10"
          >
            <div className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-lime-600 bg-lime-50'
                      : 'text-slate-200 hover:text-lime-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <Link
                to="/partner-login"
                className="inline-flex items-center h-10 px-4 rounded-full bg-white text-lime-600 transition-colors duration-500 ease-in-out whitespace-nowrap justify-center font-semibold hover:bg-gradient-to-r hover:from-lime-500 hover:to-emerald-500 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Partner Login
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default Header;