import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Settings,
  Save,
  Loader2,
  Key,
  Link2,
  Globe,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy
} from 'lucide-react';

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    meta_app_id: '',
    meta_app_secret: '',
    meta_redirect_uri: '',
    meta_config_id: '',
    meta_webhook_verify_token: '',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/admin/whatsapp-config');
      setConfig({
        meta_app_id: res.data.meta_app_id || '',
        meta_app_secret: res.data.meta_app_secret || '',
        meta_redirect_uri: res.data.meta_redirect_uri || 'https://akashvanni.com/whatsapp-connect',
        meta_config_id: res.data.meta_config_id || '',
        meta_webhook_verify_token: res.data.meta_webhook_verify_token || '',
      });
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/whatsapp-config', config);
      toast.success('WhatsApp settings saved!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setConfig({ ...config, meta_webhook_verify_token: token });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
        <p className="text-gray-500">Configure Meta (Facebook) WhatsApp Business API integration</p>
      </div>

      {/* Setup Guide */}
      <div className="card mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Setup Guide</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Create a Meta App at <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
              <li>Add WhatsApp product to your app</li>
              <li>Configure WhatsApp Embedded Signup</li>
              <li>Copy App ID and App Secret from App Settings</li>
              <li>Set up the webhook URL for message status updates</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          Meta App Configuration
        </h3>

        <div className="space-y-6">
          {/* App ID */}
          <div>
            <label className="label flex items-center gap-2">
              <Key className="h-4 w-4" />
              Meta App ID
            </label>
            <input
              type="text"
              value={config.meta_app_id}
              onChange={(e) => setConfig({ ...config, meta_app_id: e.target.value })}
              className="input"
              placeholder="123456789012345"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in App Settings &gt; Basic &gt; App ID
            </p>
          </div>

          {/* App Secret */}
          <div>
            <label className="label flex items-center gap-2">
              <Key className="h-4 w-4" />
              Meta App Secret
            </label>
            <input
              type="password"
              value={config.meta_app_secret}
              onChange={(e) => setConfig({ ...config, meta_app_secret: e.target.value })}
              className="input"
              placeholder="Enter App Secret"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in App Settings &gt; Basic &gt; App Secret
            </p>
          </div>

          {/* Redirect URI */}
          <div>
            <label className="label flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              OAuth Redirect URI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.meta_redirect_uri}
                onChange={(e) => setConfig({ ...config, meta_redirect_uri: e.target.value })}
                className="input flex-1"
                placeholder="https://yourdomain.com/whatsapp-connect"
              />
              <button
                onClick={() => copyToClipboard(config.meta_redirect_uri)}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add this URL to Facebook Login &gt; Settings &gt; Valid OAuth Redirect URIs
            </p>
          </div>

          {/* Embedded Signup Config ID */}
          <div>
            <label className="label flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Embedded Signup Config ID (Optional)
            </label>
            <input
              type="text"
              value={config.meta_config_id}
              onChange={(e) => setConfig({ ...config, meta_config_id: e.target.value })}
              className="input"
              placeholder="123456789"
            />
            <p className="text-xs text-gray-500 mt-1">
              From WhatsApp &gt; Embedded Signup Configuration
            </p>
          </div>

          {/* Webhook Verify Token */}
          <div>
            <label className="label flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Webhook Verify Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.meta_webhook_verify_token}
                onChange={(e) => setConfig({ ...config, meta_webhook_verify_token: e.target.value })}
                className="input flex-1"
                placeholder="your_verify_token"
              />
              <button
                onClick={generateVerifyToken}
                className="btn-secondary"
              >
                Generate
              </button>
              <button
                onClick={() => copyToClipboard(config.meta_webhook_verify_token)}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use this token when configuring the webhook in Meta Dashboard
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Webhook Configuration */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-gray-500" />
          Webhook Configuration
        </h3>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Webhook URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                https://api.akashvanni.com/whatsapp/webhook
              </code>
              <button
                onClick={() => copyToClipboard('https://api.akashvanni.com/whatsapp/webhook')}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Webhook Fields to Subscribe</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['messages', 'message_deliveries', 'message_reads'].map((field) => (
                <span key={field} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Customers */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-gray-500" />
          Quick Links
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-700">Meta Developer Dashboard</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a
            href="https://business.facebook.com/settings/whatsapp-business-accounts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-700">WhatsApp Business Accounts</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-700">Cloud API Documentation</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/embedded-signup"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-700">Embedded Signup Guide</span>
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
