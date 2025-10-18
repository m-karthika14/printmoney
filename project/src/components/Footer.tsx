// React import removed (not required in modern JSX setups)
import { Link } from 'react-router-dom';
import { Printer, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Branding */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-lime-500 p-2 rounded-xl">
                <Printer className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">EazePrint</span>
            </Link>
            <p className="text-gray-300 text-sm max-w-sm">
              Cloud printing made simple — upload, pay, and pick up in minutes from our partner shops.
            </p>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <div className="flex flex-col space-y-2">
              <a href="#" className="text-gray-300 hover:text-lime-400 text-sm transition-colors duration-200">
                Help Center
              </a>
              <a href="#" className="text-gray-300 hover:text-lime-400 text-sm transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-300 hover:text-lime-400 text-sm transition-colors duration-200">
                Terms of Service
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-lime-400" />
                <a href="mailto:support@eazeprint.com" className="text-gray-300 text-sm hover:text-lime-400">support@eazeprint.com</a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-lime-400" />
                <span className="text-gray-300 text-sm">+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-lime-400" />
                <span className="text-gray-300 text-sm">Bangalore, India</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 EazePrint. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;