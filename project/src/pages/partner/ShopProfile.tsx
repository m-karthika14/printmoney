import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  QrCode, 
  Camera, 
  Save, 
  Globe,
  Languages,
  Power,
  Star,
  Edit3
} from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const ShopProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [shopData, setShopData] = useState({
    name: 'Raj Digital Center',
    description: 'Professional printing services with fast turnaround times. We specialize in high-quality documents, photos, and business materials.',
    address: '123 MG Road, Bangalore, Karnataka 560001',
    phone: '+91 98765 43210',
    email: 'raj@digitalcenter.com',
    website: 'www.rajdigitalcenter.com',
    isOpen: true,
    rating: 4.8,
    totalReviews: 156,
    languages: ['English', 'Hindi', 'Kannada'],
    workingHours: {
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '09:00', close: '20:00', closed: false },
      sunday: { open: '10:00', close: '18:00', closed: false }
    },
    services: [
      'Black & White Printing',
      'Color Printing',
      'Document Scanning',
      'Spiral Binding',
      'Lamination',
      'Photo Printing'
    ],
    specialOffers: [
      'First-time customer 10% off',
      'Bulk printing discounts',
      'Same-day binding service'
    ]
  });

  const [tempData, setTempData] = useState({ ...shopData });

  const handleSave = () => {
    setShopData({ ...tempData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempData({ ...shopData });
    setIsEditing(false);
  };

  const toggleShopStatus = () => {
    const newStatus = !shopData.isOpen;
    setShopData({ ...shopData, isOpen: newStatus });
    setTempData({ ...tempData, isOpen: newStatus });
  };

  const updateWorkingHours = (day, field, value) => {
    setTempData({
      ...tempData,
      workingHours: {
        ...tempData.workingHours,
        [day]: {
          ...tempData.workingHours[day],
          [field]: value
        }
      }
    });
  };

  const addService = (service) => {
    if (service && !tempData.services.includes(service)) {
      setTempData({
        ...tempData,
        services: [...tempData.services, service]
      });
    }
  };

  const removeService = (index) => {
    setTempData({
      ...tempData,
      services: tempData.services.filter((_, i) => i !== index)
    });
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <PartnerLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop Profile</h1>
            <p className="text-gray-600 mt-2">Manage your shop information and settings</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleShopStatus}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                shopData.isOpen
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              <Power className="h-5 w-5" />
              <span>{shopData.isOpen ? 'Shop Open' : 'Shop Closed'}</span>
            </button>
            {isEditing ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 bg-lime-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-lime-600 transition-colors duration-200"
                >
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 border border-lime-500 text-lime-600 px-6 py-3 rounded-xl font-semibold hover:bg-lime-50 transition-colors duration-200"
              >
                <Edit3 className="h-5 w-5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">R</span>
                  </div>
                  {isEditing && (
                    <button className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                      <Camera className="h-4 w-4 text-gray-600" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={tempData.name}
                      onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
                      className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-lime-500 focus:outline-none w-full"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900">{shopData.name}</h2>
                  )}
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="font-semibold text-gray-900">{shopData.rating}</span>
                      <span className="text-gray-600">({shopData.totalReviews} reviews)</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      shopData.isOpen 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {shopData.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={tempData.description}
                      onChange={(e) => setTempData({ ...tempData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    />
                  ) : (
                    <p className="text-gray-700">{shopData.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Address
                    </label>
                    {isEditing ? (
                      <textarea
                        value={tempData.address}
                        onChange={(e) => setTempData({ ...tempData, address: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    ) : (
                      <p className="text-gray-700">{shopData.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={tempData.phone}
                        onChange={(e) => setTempData({ ...tempData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    ) : (
                      <p className="text-gray-700">{shopData.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-1" />
                      Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={tempData.email}
                        onChange={(e) => setTempData({ ...tempData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    ) : (
                      <p className="text-gray-700">{shopData.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Website
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={tempData.website}
                        onChange={(e) => setTempData({ ...tempData, website: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                      />
                    ) : (
                      <p className="text-gray-700">{shopData.website}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Working Hours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <Clock className="h-6 w-6 text-lime-500" />
                <h3 className="text-xl font-semibold text-gray-900">Working Hours</h3>
              </div>

              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 capitalize w-20">{day}</span>
                      {isEditing && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={tempData.workingHours[day].closed}
                            onChange={(e) => updateWorkingHours(day, 'closed', e.target.checked)}
                            className="rounded text-lime-500 focus:ring-lime-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Closed</span>
                        </label>
                      )}
                    </div>
                    
                    {(isEditing ? tempData : shopData).workingHours[day].closed ? (
                      <span className="text-red-600 font-medium">Closed</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <input
                              type="time"
                              value={tempData.workingHours[day].open}
                              onChange={(e) => updateWorkingHours(day, 'open', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={tempData.workingHours[day].close}
                              onChange={(e) => updateWorkingHours(day, 'close', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                            />
                          </>
                        ) : (
                          <span className="text-gray-700">
                            {shopData.workingHours[day].open} - {shopData.workingHours[day].close}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Services Offered</h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(isEditing ? tempData : shopData).services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-lime-100 text-lime-800 rounded-full text-sm font-medium"
                  >
                    {service}
                    {isEditing && (
                      <button
                        onClick={() => removeService(index)}
                        className="ml-2 text-lime-600 hover:text-lime-800"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isEditing && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add new service"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addService(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6 text-center"
            >
              <div className="flex items-center justify-center space-x-2 mb-4">
                <QrCode className="h-6 w-6 text-lime-500" />
                <h3 className="text-lg font-semibold text-gray-900">Shop QR Code</h3>
              </div>
              
              <div className="bg-gray-100 rounded-xl p-8 mb-4">
                <QrCode className="h-32 w-32 text-gray-400 mx-auto" />
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Customers can scan this QR code to access your shop directly
              </p>
              
              <button className="w-full bg-lime-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-lime-600 transition-colors duration-200">
                Download QR Code
              </button>
            </motion.div>

            {/* Languages */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Languages className="h-6 w-6 text-lime-500" />
                <h3 className="text-lg font-semibold text-gray-900">Languages</h3>
              </div>
              
              <div className="space-y-2">
                {shopData.languages.map((language, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{language}</span>
                    <span className="text-green-600">✓</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Special Offers */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Offers</h3>
              
              <div className="space-y-3">
                {shopData.specialOffers.map((offer, index) => (
                  <div key={index} className="p-3 bg-gradient-to-r from-lime-50 to-emerald-50 rounded-lg border border-lime-200">
                    <p className="text-sm text-lime-800 font-medium">{offer}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default ShopProfile;