import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  RefreshCw,
  Loader2,
  Phone,
  Users,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  Key,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TwilioSync() {
  const [customers, setCustomers] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [daysBack, setDaysBack] = useState(7);

  // New mapping form
  const [newPhone, setNewPhone] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newTwilioSid, setNewTwilioSid] = useState('');
  const [newTwilioToken, setNewTwilioToken] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addingMapping, setAddingMapping] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, mappingsRes] = await Promise.all([
        api.get('/admin/customers?limit=100'),
        api.get('/admin/phone-mappings')
      ]);
      setCustomers(customersRes.data);
      setMappings(mappingsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newPhone || !newUserId) {
      toast.error('Please fill in all fields');
      return;
    }

    // Format phone number
    let formattedPhone = newPhone.trim();
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    setAddingMapping(true);
    try {
      const payload = {
        phone_number: formattedPhone,
        user_id: parseInt(newUserId)
      };

      // Add Twilio credentials if provided
      if (newTwilioSid.trim()) {
        payload.twilio_account_sid = newTwilioSid.trim();
      }
      if (newTwilioToken.trim()) {
        payload.twilio_auth_token = newTwilioToken.trim();
      }

      await api.post('/admin/phone-mappings', payload);
      toast.success('Phone mapping added');
      setNewPhone('');
      setNewUserId('');
      setNewTwilioSid('');
      setNewTwilioToken('');
      setShowAdvanced(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add mapping:', error);
      toast.error(error.response?.data?.detail || 'Failed to add mapping');
    } finally {
      setAddingMapping(false);
    }
  };

  const handleDeleteMapping = async (mappingId) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      await api.delete(`/admin/phone-mappings/${mappingId}`);
      toast.success('Mapping deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await api.post(`/admin/sync-twilio-messages?days_back=${daysBack}`);
      setSyncResult({
        success: true,
        ...res.data
      });
      toast.success(`Synced ${res.data.imported} messages`);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        error: error.response?.data?.detail || 'Sync failed'
      });
      toast.error(error.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Twilio Sync</h1>
        <p className="text-gray-500">Sync messages from Twilio and map phone numbers to customers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phone Mappings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Phone Mappings
            </h2>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Map Twilio phone numbers to customers</p>
                <p className="mt-1">When syncing, messages from/to these numbers will be assigned to the mapped customer.</p>
              </div>
            </div>
          </div>

          {/* Add New Mapping */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Mapping</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-gray-500">Phone Number (with country code)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+916355060488"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Customer</label>
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Advanced: Twilio Subaccount Credentials */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Key className="h-4 w-4" />
                  Twilio Subaccount Credentials (Optional)
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 mb-3">
                      If this customer uses their own Twilio subaccount, enter their credentials below.
                      Leave empty to use global Twilio credentials.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">Twilio Account SID</label>
                        <input
                          type="text"
                          value={newTwilioSid}
                          onChange={(e) => setNewTwilioSid(e.target.value)}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="input mt-1 font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Twilio Auth Token</label>
                        <input
                          type="password"
                          value={newTwilioToken}
                          onChange={(e) => setNewTwilioToken(e.target.value)}
                          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="input mt-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddMapping}
                disabled={addingMapping || !newPhone || !newUserId}
                className="btn-primary flex items-center justify-center gap-2"
              >
                {addingMapping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Mapping
              </button>
            </div>
          </div>

          {/* Existing Mappings */}
          <div className="space-y-2">
            {mappings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No mappings configured</p>
            ) : (
              mappings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{m.phone_number}</p>
                        {m.has_twilio_credentials && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            <Key className="h-3 w-3" />
                            Subaccount
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{m.user_name} ({m.user_email})</p>
                      {m.twilio_account_sid && (
                        <p className="text-xs text-gray-400 font-mono">SID: {m.twilio_account_sid}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMapping(m.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sync Messages */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              Sync Messages
            </h2>
          </div>

          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium">Automatically fetch messages from Twilio</p>
                <p className="mt-1">Messages will be imported and charges applied based on pricing:</p>
                <ul className="mt-2 space-y-1">
                  <li>• <span className="font-medium">Template (outbound)</span>: ₹2.00 each</li>
                  <li>• <span className="font-medium">Session (inbound)</span>: Free</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sync Options */}
          <div className="mb-4">
            <label className="label flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Days to sync
            </label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(parseInt(e.target.value))}
              className="input"
            >
              <option value={1}>Last 1 day</option>
              <option value={3}>Last 3 days</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || mappings.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Sync from Twilio
              </>
            )}
          </button>

          {mappings.length === 0 && (
            <p className="text-sm text-amber-600 mt-2 text-center">
              Add phone mappings first before syncing
            </p>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className={`mt-4 p-4 rounded-lg ${syncResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-start gap-3">
                {syncResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  {syncResult.success ? (
                    <>
                      <p className="font-medium text-green-800">Sync Completed</p>
                      <div className="mt-2 text-sm text-green-700 space-y-1">
                        <p>Imported: {syncResult.imported} messages</p>
                        <p>Skipped (duplicates): {syncResult.skipped}</p>
                        <p>No mapping: {syncResult.no_mapping}</p>
                      </div>

                      {/* Per-user stats */}
                      {syncResult.user_stats && Object.keys(syncResult.user_stats).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="font-medium text-green-800 mb-2">Per Customer:</p>
                          {Object.entries(syncResult.user_stats).map(([userId, stats]) => {
                            const customer = customers.find(c => c.id === parseInt(userId));
                            return (
                              <div key={userId} className="text-sm text-green-700 py-1">
                                <span className="font-medium">{customer?.name || `User ${userId}`}</span>: {stats.messages} msgs (₹{stats.cost_rupees.toFixed(2)})
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-red-800">Sync Failed</p>
                      <p className="text-sm text-red-600 mt-1">{syncResult.error}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
