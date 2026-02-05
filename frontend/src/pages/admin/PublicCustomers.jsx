import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Users,
  Loader2,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Phone,
  User,
  Link,
  FileText,
  CreditCard,
  Check,
  Clock,
  IndianRupee
} from 'lucide-react';

export default function PublicCustomers() {
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('customers');

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    user_id: '',
    notes: ''
  });
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersRes, paymentsRes, usersRes] = await Promise.all([
        api.get('/admin/public-customers').catch(() => ({ data: { customers: [] } })),
        api.get('/admin/public-payments').catch(() => ({ data: { payments: [] } })),
        api.get('/admin/customers?limit=100').catch(() => ({ data: [] }))
      ]);
      // API returns {total, customers: [...]} and {total, payments: [...]}
      setCustomers(customersRes.data?.customers || []);
      setPayments(paymentsRes.data?.payments || []);
      setRegisteredUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({ phone: '', name: '', user_id: '', notes: '' });
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      phone: customer.phone,
      name: customer.name,
      user_id: customer.user_id?.toString() || '',
      notes: customer.notes || ''
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.phone || !formData.name) {
      toast.error('Phone and Name are required');
      return;
    }

    try {
      const payload = {
        phone: formData.phone,
        name: formData.name,
        user_id: formData.user_id ? parseInt(formData.user_id) : null,
        notes: formData.notes || null
      };

      if (editingCustomer) {
        await api.put(`/admin/public-customers/${editingCustomer.id}`, payload);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/admin/public-customers', payload);
        toast.success('Customer added successfully');
      }

      setShowCustomerModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return;
    }

    try {
      await api.delete(`/admin/public-customers/${customer.id}`);
      toast.success('Customer deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleProcessPayment = (payment) => {
    setSelectedPayment(payment);
    setAdminNotes('');
    setShowPaymentModal(true);
  };

  const confirmProcessPayment = async () => {
    if (!selectedPayment) return;

    try {
      await api.post(`/admin/public-payments/${selectedPayment.id}/process`, {
        admin_notes: adminNotes
      });
      toast.success('Payment processed and credited to customer');
      setShowPaymentModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const filteredPayments = payments.filter(
    (p) =>
      (p.customer_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      p.phone.includes(search)
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Customers</h1>
        <p className="text-gray-500">Manage public portal customers and their payments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Customers ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          Payments ({payments.filter(p => !p.processed && p.status === 'completed').length} pending)
        </button>
      </div>

      {/* Search and Add */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'customers' ? "Search by name or phone..." : "Search payments..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        {activeTab === 'customers' && (
          <button
            onClick={handleAddCustomer}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="card overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No portal customers found</p>
              <button
                onClick={handleAddCustomer}
                className="mt-4 text-blue-600 hover:underline"
              >
                Add your first customer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Linked User</th>
                    <th className="pb-3 font-medium">Notes</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => {
                    const linkedUser = registeredUsers.find(u => u.id === customer.user_id);
                    return (
                      <tr key={customer.id}>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{customer.name}</p>
                              <p className="text-xs text-gray-500">ID: {customer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                        </td>
                        <td className="py-4">
                          {linkedUser ? (
                            <div className="flex items-center gap-2">
                              <Link className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-green-700">{linkedUser.name}</p>
                                <p className="text-xs text-gray-500">User #{linkedUser.id}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not linked</span>
                          )}
                        </td>
                        <td className="py-4">
                          <p className="text-sm text-gray-500 max-w-xs truncate">
                            {customer.notes || '-'}
                          </p>
                        </td>
                        <td className="py-4 text-gray-500 text-sm">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCustomer(customer)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="card overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No portal payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Credit</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className={payment.processed ? 'bg-gray-50' : ''}>
                      <td className="py-4">
                        <p className="font-medium text-gray-900">
                          {payment.customer_name || 'Unknown'}
                        </p>
                        {payment.user_id && (
                          <p className="text-xs text-green-600">Linked to User #{payment.user_id}</p>
                        )}
                      </td>
                      <td className="py-4 text-gray-600">{payment.phone}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 font-semibold text-gray-900">
                          <IndianRupee className="h-4 w-4" />
                          {(payment.amount / 100).toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500">
                          GST: ₹{(payment.gst_amount / 100).toFixed(2)}
                        </p>
                      </td>
                      <td className="py-4">
                        <span className="text-green-600 font-semibold">
                          ₹{(payment.credited_amount / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4">
                        {payment.status === 'completed' ? (
                          payment.processed ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <Check className="h-3 w-3" />
                              Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {payment.status}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-gray-500 text-sm">
                        {new Date(payment.created_at).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {payment.status === 'completed' && !payment.processed && (
                          <button
                            onClick={() => handleProcessPayment(payment)}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            Process
                          </button>
                        )}
                        {payment.processed && payment.admin_notes && (
                          <span className="text-xs text-gray-500" title={payment.admin_notes}>
                            <FileText className="h-4 w-4 inline" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingCustomer ? 'Edit Customer' : 'Add Portal Customer'}
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="e.g., 919876543210"
                />
              </div>

              <div>
                <label className="label">Customer Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="label">User ID (Optional - for mapping)</label>
                <input
                  type="number"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="input"
                  placeholder="Enter User ID to link payments"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If linked, portal payments will auto-credit to this user account
                </p>
              </div>

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="btn-primary flex-1"
              >
                {editingCustomer ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Process Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium">{selectedPayment.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">{selectedPayment.phone}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount Paid</p>
                  <p className="font-semibold">₹{(selectedPayment.amount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">To Credit</p>
                  <p className="font-semibold text-green-600">
                    ₹{(selectedPayment.credited_amount / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {selectedPayment.user_id ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">
                  <Check className="h-4 w-4 inline mr-1" />
                  This payment will be credited to User #{selectedPayment.user_id}
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700">
                  No user linked. First link this phone to a registered user in the Customers tab.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Admin Notes (Optional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="input"
                rows={2}
                placeholder="e.g., Manually credited after verification"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={confirmProcessPayment}
                disabled={!selectedPayment.user_id}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Credit ₹{(selectedPayment.credited_amount / 100).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
