import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Phone,
  Building2,
  Shield,
  Zap,
  XCircle,
  Settings,
  ArrowRight
} from 'lucide-react';

export default function WhatsAppConnect() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchConnectionStatus();

    // Handle OAuth callback
    const code = searchParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, [searchParams]);

  const fetchConnectionStatus = async () => {
    try {
      const res = await api.get('/whatsapp/connection-status');
      setConnectionStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code) => {
    setConnecting(true);
    try {
      const res = await api.post('/whatsapp/connect', { code });
      toast.success('WhatsApp Business connected successfully!');
      setConnectionStatus(res.data);
      refreshUser();
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const initiateConnection = async () => {
    setConnecting(true);
    try {
      const res = await api.get('/whatsapp/oauth-url');
      window.location.href = res.data.oauth_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate connection');
      setConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect your WhatsApp Business account?')) {
      return;
    }

    setDisconnecting(true);
    try {
      await api.post('/whatsapp/disconnect');
      toast.success('WhatsApp Business disconnected');
      setConnectionStatus({ connected: false });
      refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.post('/whatsapp/test-connection');
      if (res.data.success) {
        toast.success('Connection is working! Test message sent.');
      } else {
        toast.error(res.data.error || 'Connection test failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const benefits = [
    { icon: Zap, title: 'Official WhatsApp API', desc: 'Send messages through Meta\'s official Business API' },
    { icon: Shield, title: 'Secure & Compliant', desc: 'End-to-end encryption and GDPR compliant' },
    { icon: CheckCircle2, title: 'High Delivery Rate', desc: '99.9% message delivery guarantee' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
        <p className="text-gray-500">Connect your WhatsApp Business account to send messages</p>
      </div>

      {/* Connection Status Card */}
      <div className={`card mb-6 ${
        connectionStatus?.connected
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              connectionStatus?.connected ? 'bg-green-100' : 'bg-gray-200'
            }`}>
              <MessageSquare className={`h-8 w-8 ${
                connectionStatus?.connected ? 'text-green-600' : 'text-gray-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {connectionStatus?.connected ? 'Connected' : 'Not Connected'}
                </h2>
                {connectionStatus?.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              {connectionStatus?.connected ? (
                <div className="mt-1 space-y-1">
                  <p className="text-gray-600 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {connectionStatus.phone_number || 'Phone number connected'}
                  </p>
                  <p className="text-gray-600 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {connectionStatus.business_name || 'Business account'}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 mt-1">
                  Connect your Facebook Business account to start sending WhatsApp messages
                </p>
              )}
            </div>
          </div>

          {connectionStatus?.connected && (
            <div className="flex items-center gap-2">
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="btn-secondary flex items-center gap-2"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Test
              </button>
              <button
                onClick={disconnectWhatsApp}
                disabled={disconnecting}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connected - Show Details */}
      {connectionStatus?.connected && (
        <>
          {/* Account Details */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500" />
              Account Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">WhatsApp Business Account ID</p>
                <p className="font-mono text-sm text-gray-800 mt-1">
                  {connectionStatus.waba_id || '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Phone Number ID</p>
                <p className="font-mono text-sm text-gray-800 mt-1">
                  {connectionStatus.phone_number_id || '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Display Name</p>
                <p className="text-gray-800 mt-1">
                  {connectionStatus.display_name || '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Quality Rating</p>
                <p className={`mt-1 font-medium ${
                  connectionStatus.quality_rating === 'GREEN' ? 'text-green-600' :
                  connectionStatus.quality_rating === 'YELLOW' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {connectionStatus.quality_rating || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Message Templates */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-500" />
                Message Templates
              </h3>
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                Manage Templates
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Create and manage your WhatsApp message templates in the Meta Business Suite.
              Templates must be approved before you can use them.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> New templates take 24-48 hours to be reviewed and approved by Meta.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/messages"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Send Messages</p>
                  <p className="text-sm text-gray-500">Start sending WhatsApp messages</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
              </a>
              <a
                href="https://business.facebook.com/settings/whatsapp-business-accounts/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Business Settings</p>
                  <p className="text-sm text-gray-500">Manage in Meta Business Suite</p>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400 ml-auto" />
              </a>
            </div>
          </div>
        </>
      )}

      {/* Not Connected - Show Connect Flow */}
      {!connectionStatus?.connected && (
        <>
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="card">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                  <benefit.icon className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-500">{benefit.desc}</p>
              </div>
            ))}
          </div>

          {/* Prerequisites */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Before You Connect
            </h3>
            <div className="space-y-3">
              {[
                'A Facebook Business Account (create one at business.facebook.com)',
                'A verified business with Meta (business verification)',
                'A phone number not already registered with WhatsApp',
                'Access to receive SMS or calls for phone verification',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-gray-600">{i + 1}</span>
                  </div>
                  <p className="text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Connect Button */}
          <div className="card text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Connect Your WhatsApp Business
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Click the button below to connect your Facebook Business account and start sending WhatsApp messages.
            </p>
            <button
              onClick={initiateConnection}
              disabled={connecting}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.884 1.884 0 0 0 4.8 21.454l3.032-.892A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-3.867-1.003l-.278-.164-2.887.849.849-2.887-.164-.278A7.963 7.963 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.384-5.927c-.24-.12-1.415-.698-1.635-.778-.22-.08-.38-.12-.54.12-.16.24-.62.778-.76.938-.14.16-.28.18-.52.06-.24-.12-1.011-.373-1.926-1.19-.712-.635-1.193-1.42-1.333-1.66-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.302-.74-1.782-.195-.469-.394-.405-.54-.413l-.46-.008a.88.88 0 0 0-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.695 2.59 4.108 3.63.575.248 1.023.396 1.372.507.577.183 1.102.157 1.517.095.463-.069 1.415-.578 1.615-1.137.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
                  </svg>
                  Connect with Facebook Business
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              You'll be redirected to Facebook to authorize access
            </p>
          </div>

          {/* Help Section */}
          <div className="card mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Need Help?</h3>
            <div className="space-y-3">
              <a
                href="https://www.facebook.com/business/help/2169003770027706"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">How to create a Facebook Business Account</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="https://www.facebook.com/business/help/2058515294227817"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">Business verification guide</span>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="mailto:support@akashvanni.com"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">Contact our support team</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
