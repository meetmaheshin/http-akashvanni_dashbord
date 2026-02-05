import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Loader2,
  Search,
  Eye,
  Edit,
  X,
  Check,
  LogIn,
  Globe,
  Phone,
  Plus,
  Copy
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [impersonating, setImpersonating] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    email: '',
    name: '',
    phone: '',
    company_name: '',
    portal_enabled: false,
    portal_user_id: '',
    initial_balance: 0
  });
  const [createdPassword, setCreatedPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { setImpersonationMode } = useAuth();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/admin/customers?limit=100');
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (customer) => {
    try {
      await api.put(`/admin/customers/${customer.id}`, {
        is_active: !customer.is_active,
      });
      toast.success(`Customer ${customer.is_active ? 'deactivated' : 'activated'}`);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update customer');
    }
  };

  const togglePortal = async (customer) => {
    try {
      await api.put(`/admin/customers/${customer.id}`, {
        portal_enabled: !customer.portal_enabled,
      });
      toast.success(`Portal ${customer.portal_enabled ? 'disabled' : 'enabled'} for ${customer.name}`);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update portal status');
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.email || !newCustomer.name) {
      toast.error('Email and name are required');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/admin/customers', {
        ...newCustomer,
        portal_user_id: newCustomer.portal_user_id ? parseInt(newCustomer.portal_user_id) : null,
        initial_balance: (newCustomer.initial_balance || 0) * 100 // Convert to paise
      });
      toast.success('Customer created successfully');
      setCreatedPassword(res.data.password);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
      setShowAddModal(false);
    } finally {
      setCreating(false);
    }
  };

  const resetAddForm = () => {
    setNewCustomer({
      email: '',
      name: '',
      phone: '',
      company_name: '',
      portal_enabled: false,
      portal_user_id: '',
      initial_balance: 0
    });
    setCreatedPassword('');
    setShowAddModal(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createdPassword);
    toast.success('Password copied!');
  };

  const handleBalanceAdjustment = async () => {
    if (!adjustmentAmount || isNaN(adjustmentAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await api.put(`/admin/customers/${selectedCustomer.id}`, {
        balance_adjustment: parseInt(adjustmentAmount) * 100, // Convert to paise
        adjustment_reason: adjustmentReason || 'Admin adjustment',
      });
      toast.success('Balance updated successfully');
      setShowModal(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  const handleViewAsCustomer = async (customer) => {
    setImpersonating(customer.id);
    try {
      const res = await api.post(`/admin/impersonate/${customer.id}`);

      // Store admin token for later
      const adminToken = localStorage.getItem('token');
      localStorage.setItem('admin_token', adminToken);

      // Set new token
      localStorage.setItem('token', res.data.access_token);

      // Set impersonation mode in context
      if (setImpersonationMode) {
        setImpersonationMode(true, customer.name, res.data.impersonated_by);
      }

      toast.success(`Viewing as ${customer.name}`);

      // Redirect to customer dashboard
      navigate('/dashboard');
      window.location.reload(); // Reload to apply new token
    } catch (error) {
      console.error('Failed to impersonate:', error);
      toast.error(error.response?.data?.detail || 'Failed to view as customer');
    } finally {
      setImpersonating(null);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">Manage your customer accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Customers Table */}
      <div className="card overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Portal</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                        {customer.company_name && (
                          <p className="text-xs text-gray-400">{customer.company_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      {customer.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No phone</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="font-semibold text-gray-900">
                        ₹{(customer.balance / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          customer.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => togglePortal(customer)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                          customer.portal_enabled
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={customer.portal_enabled ? 'Click to disable portal' : 'Click to enable portal'}
                      >
                        <Globe className="h-3 w-3" />
                        {customer.portal_enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-4 text-gray-500 text-sm">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewAsCustomer(customer)}
                          disabled={impersonating === customer.id}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View as customer"
                        >
                          {impersonating === customer.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Adjust balance"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(customer)}
                          className={`p-2 rounded-lg transition-colors ${
                            customer.is_active
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={customer.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {customer.is_active ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Balance Adjustment Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adjust Balance</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{selectedCustomer.name}</p>
              <p className="text-sm text-gray-500">
                Current balance: ₹{(selectedCustomer.balance / 100).toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="label">Amount (in Rupees)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="input"
                  placeholder="Enter amount (negative to deduct)"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use positive value to add, negative to deduct
              </p>
            </div>

            <div className="mb-6">
              <label className="label">Reason (optional)</label>
              <input
                type="text"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="input"
                placeholder="e.g., Promotional credit"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBalanceAdjustment}
                className="btn-primary flex-1"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {createdPassword ? 'Customer Created' : 'Add New Customer'}
              </h3>
              <button
                onClick={resetAddForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdPassword ? (
              <div>
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium mb-2">Customer created successfully!</p>
                  <p className="text-sm text-gray-600 mb-3">
                    Share these login credentials with the customer:
                  </p>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm"><strong>Email:</strong> {newCustomer.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm"><strong>Password:</strong> {createdPassword}</p>
                      <button
                        onClick={copyPassword}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Copy password"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetAddForm}
                  className="btn-primary w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-4">
                  <div>
                    <label className="label">Email *</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="input"
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <label className="label">Name *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="input"
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <label className="label">Phone (for portal)</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="input"
                      placeholder="10-digit phone number"
                    />
                  </div>

                  <div>
                    <label className="label">Company Name</label>
                    <input
                      type="text"
                      value={newCustomer.company_name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                      className="input"
                      placeholder="Company name (optional)"
                    />
                  </div>

                  <div>
                    <label className="label">Initial Balance (₹)</label>
                    <input
                      type="number"
                      value={newCustomer.initial_balance}
                      onChange={(e) => setNewCustomer({ ...newCustomer, initial_balance: parseInt(e.target.value) || 0 })}
                      className="input"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="label">Portal User ID</label>
                    <input
                      type="number"
                      value={newCustomer.portal_user_id}
                      onChange={(e) => setNewCustomer({ ...newCustomer, portal_user_id: e.target.value })}
                      className="input"
                      placeholder="Custom numeric ID (optional)"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="portal_enabled"
                      checked={newCustomer.portal_enabled}
                      onChange={(e) => setNewCustomer({ ...newCustomer, portal_enabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="portal_enabled" className="text-sm text-gray-700">
                      Enable portal recharge (requires phone number)
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={resetAddForm}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomer}
                    disabled={creating}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Customer'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
