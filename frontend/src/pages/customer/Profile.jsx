import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Building2, MapPin, FileText, Save, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company_name: '',
    gst_number: '',
    billing_address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        company_name: user.company_name || '',
        gst_number: user.gst_number || '',
        billing_address: user.billing_address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put('/customer/profile', formData);
      toast.success('Profile updated successfully');
      refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your personal and billing information</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Details */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Personal Details</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+91 9876543210"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                className="input bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-2 rounded-lg">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="input"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="label">GST Number (GSTIN)</label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                className="input uppercase"
                placeholder="e.g., 07ATPPM6940D1ZG"
                maxLength={15}
              />
              <p className="text-xs text-gray-400 mt-1">Required for GST invoice</p>
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-2 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Address</label>
              <textarea
                name="billing_address"
                value={formData.billing_address}
                onChange={handleChange}
                className="input min-h-[80px]"
                placeholder="Street address, building, floor, etc."
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="label">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select State</option>
                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="input"
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        </div>

        {/* GST Info */}
        <div className="card mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">GST Invoice Information</h3>
              <p className="text-sm text-amber-700 mt-1">
                If you provide your GST number, you will receive proper GST invoices for all your payments.
                The invoice will include 18% GST breakdown (9% CGST + 9% SGST).
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
