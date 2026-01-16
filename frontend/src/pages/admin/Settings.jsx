import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Cog, Loader2, Save, Plus, Trash2, Key, Globe, X } from 'lucide-react';

export default function Settings() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    api_key: '',
    api_secret: '',
    api_url: '',
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/admin/api-configs');
      setConfigs(res.data);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      await api.post('/admin/api-configs', newConfig);
      toast.success('Configuration added');
      setShowAddModal(false);
      setNewConfig({ name: '', api_key: '', api_secret: '', api_url: '' });
      fetchConfigs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add config');
    }
  };

  const handleDeleteConfig = async (id) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await api.delete(`/admin/api-configs/${id}`);
      toast.success('Configuration deleted');
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to delete config');
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
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Settings</h1>
        <p className="text-gray-500">Configure your integrations</p>
      </div>

      {/* Razorpay Info Card */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Key className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Razorpay Configuration</h2>
            <p className="text-sm text-gray-500">Payment gateway settings</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
          Razorpay credentials are configured via environment variables for security.
          Set <code className="bg-yellow-100 px-1 rounded">RAZORPAY_KEY_ID</code> and{' '}
          <code className="bg-yellow-100 px-1 rounded">RAZORPAY_KEY_SECRET</code> in your
          backend .env file.
        </p>
      </div>

      {/* API Configurations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Globe className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">API Configurations</h2>
              <p className="text-sm text-gray-500">WhatsApp and other integrations</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Config
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="text-center py-8">
            <Cog className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No API configurations yet</p>
            <p className="text-sm text-gray-400">Add your WhatsApp API credentials to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 capitalize">{config.name}</p>
                  {config.api_url && (
                    <p className="text-sm text-gray-500">{config.api_url}</p>
                  )}
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      config.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {config.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteConfig(config.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp Setup Guide */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">WhatsApp API Setup Guide</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>To integrate WhatsApp messaging, you'll need:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>A WhatsApp Business API account (Meta, Gupshup, WATI, etc.)</li>
            <li>API credentials (Key and Secret/Token)</li>
            <li>Webhook URL for status callbacks</li>
          </ol>
          <p className="mt-4">
            Add a configuration named <code className="bg-gray-100 px-1 rounded">whatsapp</code>{' '}
            with your API URL and key to enable messaging.
          </p>
        </div>
      </div>

      {/* Add Config Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add API Configuration</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={newConfig.name}
                  onChange={(e) =>
                    setNewConfig({ ...newConfig, name: e.target.value })
                  }
                  className="input"
                  placeholder="e.g., whatsapp"
                />
              </div>

              <div>
                <label className="label">API URL</label>
                <input
                  type="text"
                  value={newConfig.api_url}
                  onChange={(e) =>
                    setNewConfig({ ...newConfig, api_url: e.target.value })
                  }
                  className="input"
                  placeholder="https://api.example.com/messages"
                />
              </div>

              <div>
                <label className="label">API Key</label>
                <input
                  type="text"
                  value={newConfig.api_key}
                  onChange={(e) =>
                    setNewConfig({ ...newConfig, api_key: e.target.value })
                  }
                  className="input"
                  placeholder="Your API key"
                />
              </div>

              <div>
                <label className="label">API Secret</label>
                <input
                  type="password"
                  value={newConfig.api_secret}
                  onChange={(e) =>
                    setNewConfig({ ...newConfig, api_secret: e.target.value })
                  }
                  className="input"
                  placeholder="Your API secret"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleAddConfig} className="btn-primary flex-1">
                Add Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
