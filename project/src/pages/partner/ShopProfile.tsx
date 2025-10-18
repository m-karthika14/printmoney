import React, { useState } from 'react';

// Type definitions
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
interface WorkingHour {
  open: string;
  close: string;
  isClosed?: boolean;
}
interface Service {
  id: string;
  name: string;
  selected: boolean;
  isCustom: boolean;
  price: string;
}
interface ShopProfileData {
  _id?: string;
  name?: string;
  shopName?: string;
  shopId: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  isOpen: boolean;
  workingHours: Record<DayOfWeek, WorkingHour>;
  services: Service[];
  qr_code_url?: string;
}

const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const defaultWorkingHours: Record<DayOfWeek, WorkingHour> = days.reduce((acc, day) => {
  acc[day] = { open: '', close: '' };
  return acc;
}, {} as Record<DayOfWeek, WorkingHour>);
const defaultShopData: ShopProfileData = {
  name: '',
  shopId: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  isOpen: true,
  workingHours: defaultWorkingHours,
  services: []
};
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  QrCode, 
  Camera, 
  Save, 
  Power,
  Edit3
} from 'lucide-react';
import PartnerLayout from '../../components/partner/PartnerLayout';

const ShopProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [shopData, setShopData] = useState<ShopProfileData>(defaultShopData);
  React.useEffect(() => {
    // Fetch shop profile from backend
    async function fetchShop() {
      try {
  const id = localStorage.getItem('shop_id') || localStorage.getItem('shopId');
        console.log('shopId from localStorage:', id);
        if (!id) return;
        const res = await fetch(`http://localhost:5000/api/shops/${id}`);
        if (!res.ok) {
          console.log('Fetch failed, status:', res.status);
          return;
        }
        const shop: ShopProfileData = await res.json();
        console.log('Fetched shop:', shop);
        // Ensure workingHours has all days
        const workingHours: Record<DayOfWeek, WorkingHour> = { ...defaultWorkingHours, ...(shop.workingHours || {}) };
        // Try to also fetch QR info
        let qrData: { qr_code_url?: string; link?: string } = {};
        try {
          const qrRes = await fetch(`http://localhost:5000/api/shops/${id}/qr`);
          if (qrRes.ok) qrData = await qrRes.json();
        } catch {}
        setShopData({ ...defaultShopData, ...shop, name: shop.name || shop.shopName, workingHours, qr_code_url: (qrData as any).qr_code_url || shop.qr_code_url });
      } catch (err) {
        console.log('Error fetching shop:', err);
      }
    }
    fetchShop();
  }, []);

  React.useEffect(() => {
    setTempData({ ...shopData });
  }, [shopData]);

  const [tempData, setTempData] = useState<ShopProfileData>({ ...shopData });

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper function to convert 12-hour format to 24-hour
  const formatTime24Hour = (hour12: string, minute: string, ampm: string) => {
    const hour = parseInt(hour12);
    const min = minute.padStart(2, '0');
    if (ampm === 'AM') {
      return hour === 12 ? `00:${min}` : `${hour.toString().padStart(2, '0')}:${min}`;
    } else {
      return hour === 12 ? `12:${min}` : `${(hour + 12).toString()}:${min}`;
    }
  };

  // Helper function to parse 24-hour time into components
  const parseTime24Hour = (time24: string) => {
    if (!time24) return { hour: '9', minute: '00', ampm: 'AM' };
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return { hour: hour12.toString(), minute: minutes, ampm };
  };

  const handleSave = () => {
    // Save changes to backend
    async function saveProfile() {
      try {
        // Use shopId from tempData/shopData
        const id = tempData._id || shopData._id || tempData.shopId || shopData.shopId;
        if (!id) return;
        // Ensure all days have open, close, isClosed
        const workingHoursToSend: Record<DayOfWeek, WorkingHour> = { ...tempData.workingHours };
        days.forEach((day) => {
          if (!workingHoursToSend[day]) workingHoursToSend[day] = { open: '', close: '', isClosed: true };
              workingHoursToSend[day].isClosed = (workingHoursToSend[day].isClosed === true || (!workingHoursToSend[day].open && !workingHoursToSend[day].close));
          if (typeof workingHoursToSend[day].open === 'undefined') workingHoursToSend[day].open = '';
          if (typeof workingHoursToSend[day].close === 'undefined') workingHoursToSend[day].close = '';
        });
        const res = await fetch(`http://localhost:5000/api/shops/${id}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: tempData.name,
            shopId: tempData.shopId,
            description: tempData.description,
            address: tempData.address,
            phone: tempData.phone,
            email: tempData.email,
            isOpen: tempData.isOpen,
            workingHours: workingHoursToSend
          })
        });
        if (res.ok) {
          const updated: ShopProfileData = await res.json();
          setShopData({ ...tempData, ...updated });
        } else {
          // handle error
        }
      } catch (err) {
        // handle error
      }
      setIsEditing(false);
    }
    saveProfile();
  };

  const handleCancel = () => {
    setTempData({ ...shopData });
    setIsEditing(false);
  };

  const fetchShop = async () => {
    try {
      // Try to get _id from localStorage if previously saved
      let id = localStorage.getItem('shopMongoId');
      if (!id) {
        // Fallback to canonical shop_id
        id = localStorage.getItem('shop_id') || localStorage.getItem('shopId');
      }
      if (!id) return;
      const res = await fetch(`http://localhost:5000/api/shops/${id}`);
      if (!res.ok) return;
      const shop: ShopProfileData = await res.json();
      // Save _id to localStorage for future requests
      if (shop._id) localStorage.setItem('shopMongoId', shop._id);
      const workingHours: Record<DayOfWeek, WorkingHour> = { ...defaultWorkingHours, ...(shop.workingHours || {}) };
      setShopData({ ...defaultShopData, ...shop, name: shop.name || shop.shopName, workingHours });
    } catch (err) {
      console.log('Error fetching shop:', err);
    }
  };

  const toggleShopStatus = async () => {
    const newStatus = !shopData.isOpen;
    // Optimistically update local state
    setShopData((prev) => ({ ...prev, isOpen: newStatus }));
    try {
      // Always use _id if available, fallback to shopId
      const id = shopData._id || localStorage.getItem('shopMongoId') || shopData.shopId;
      if (!id) return;
      const res = await fetch(`http://localhost:5000/api/shops/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: newStatus })
      });
      const result = res.ok ? await res.json() : null;
      console.log('PATCH /profile response:', result);
      if (res.ok) {
        // Refetch shop profile to get latest status from backend
        await fetchShop();
      } else {
        // Revert local state on error
        setShopData((prev) => ({ ...prev, isOpen: !newStatus }));
        console.log('Failed to update shop status');
      }
    } catch (err) {
      // Revert local state on error
      setShopData((prev) => ({ ...prev, isOpen: !newStatus }));
      console.log('Error updating shop status:', err);
    }
  };

  const updateWorkingHours = (day: DayOfWeek, field: keyof WorkingHour, value: string) => {
    setTempData({
      ...tempData,
      workingHours: {
        ...tempData.workingHours,
        [day]: {
          ...tempData.workingHours[day],
          [field]: value,
          // If closing, set isClosed true; if opening, set isClosed false
          isClosed: field === 'open' && value === '' ? true : (field === 'close' && value === '' ? true : false)
        }
      }
    });
  };

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
          <div className="flex flex-col items-end">
            {/* Shop name and ID removed - now shown in PartnerLayout navbar */}
            <div className="flex items-center space-x-3 mt-4">
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
                {days.map((day) => {
                  const wh = (isEditing ? tempData : shopData).workingHours[day as DayOfWeek] || { open: '', close: '' };
                  const isClosed = !wh.open && !wh.close;
                  return (
                    <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900 capitalize w-20">{day}</span>
                        {isEditing && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={wh.isClosed || isClosed}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                if (e.target.checked) {
                                  // Mark as closed - set empty times and isClosed true
                                  setTempData({
                                    ...tempData,
                                    workingHours: {
                                      ...tempData.workingHours,
                                      [day]: {
                                        open: '',
                                        close: '',
                                        isClosed: true
                                      }
                                    }
                                  });
                                } else {
                                  // Mark as open - set default times and isClosed false
                                  setTempData({
                                    ...tempData,
                                    workingHours: {
                                      ...tempData.workingHours,
                                      [day]: {
                                        open: '09:00',
                                        close: '17:00',
                                        isClosed: false
                                      }
                                    }
                                  });
                                }
                              }}
                              className="rounded text-lime-500 focus:ring-lime-500"
                            />
                            <span className="ml-2 text-sm text-gray-600">Closed</span>
                          </label>
                        )}
                      </div>
                      {isClosed ? (
                        <span className="text-red-600 font-medium">Closed</span>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={parseTime24Hour(wh.open).hour}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.open);
                                    const newTime = formatTime24Hour(e.target.value, parsed.minute, parsed.ampm);
                                    updateWorkingHours(day as DayOfWeek, 'open', newTime);
                                  }}
                                  className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-center"
                                  placeholder="9"
                                />
                                <span>:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={parseTime24Hour(wh.open).minute}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.open);
                                    const newTime = formatTime24Hour(parsed.hour, e.target.value.padStart(2, '0'), parsed.ampm);
                                    updateWorkingHours(day as DayOfWeek, 'open', newTime);
                                  }}
                                  className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-center"
                                  placeholder="00"
                                />
                                <select
                                  value={parseTime24Hour(wh.open).ampm}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.open);
                                    const newTime = formatTime24Hour(parsed.hour, parsed.minute, e.target.value);
                                    updateWorkingHours(day as DayOfWeek, 'open', newTime);
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                              <span>to</span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="12"
                                  value={parseTime24Hour(wh.close).hour}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.close);
                                    const newTime = formatTime24Hour(e.target.value, parsed.minute, parsed.ampm);
                                    updateWorkingHours(day as DayOfWeek, 'close', newTime);
                                  }}
                                  className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-center"
                                  placeholder="5"
                                />
                                <span>:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  value={parseTime24Hour(wh.close).minute}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.close);
                                    const newTime = formatTime24Hour(parsed.hour, e.target.value.padStart(2, '0'), parsed.ampm);
                                    updateWorkingHours(day as DayOfWeek, 'close', newTime);
                                  }}
                                  className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-center"
                                  placeholder="00"
                                />
                                <select
                                  value={parseTime24Hour(wh.close).ampm}
                                  onChange={(e) => {
                                    const parsed = parseTime24Hour(wh.close);
                                    const newTime = formatTime24Hour(parsed.hour, parsed.minute, e.target.value);
                                    updateWorkingHours(day as DayOfWeek, 'close', newTime);
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-700">
                              {formatTime12Hour(wh.open)} - {formatTime12Hour(wh.close)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              
              <div className="flex flex-wrap gap-2">
                {shopData.services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-lime-100 text-lime-800 rounded-full text-sm font-medium"
                  >
                    {service.name}
                  </span>
                ))}
              </div>
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
              
              <div className="bg-gray-100 rounded-xl p-4 mb-4 flex items-center justify-center">
                {shopData.qr_code_url ? (
                  <img
                    src={`http://localhost:5000${shopData.qr_code_url}`}
                    alt="Shop QR"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="p-8">
                    <QrCode className="h-32 w-32 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-500 mt-2">QR will appear after it's generated</p>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Customers can scan this QR code to access your shop directly
              </p>
              
              {shopData.qr_code_url ? (
                <a
                  className="block w-full text-center bg-lime-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-lime-600 transition-colors duration-200"
                  href={`http://localhost:5000${shopData.qr_code_url}`}
                  download={`${shopData.shopId || 'shop'}_QR.png`}
                >
                  Download QR Code
                </a>
              ) : (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                >
                  Generating QR...
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PartnerLayout>
  );
};

export default ShopProfile;