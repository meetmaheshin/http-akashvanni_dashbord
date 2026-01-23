import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  FileText,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
  X,
  ChevronDown,
  Send,
  RefreshCw
} from 'lucide-react';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountSid, setAccountSid] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Create form state
  const [formData, setFormData] = useState({
    friendly_name: '',
    language: 'en',
    category: 'MARKETING',
    template_type: 'twilio/text',
    body: '',
    header_text: '',
    footer_text: '',
    button_text: '',
    button_url: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customer/templates');
      setTemplates(res.data.templates || []);
      setAccountSid(res.data.account_sid);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      if (error.response?.status === 400) {
        toast.error('Twilio credentials not configured. Contact admin.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to load templates');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.friendly_name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!formData.body.trim()) {
      toast.error('Template body is required');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/customer/templates', formData);
      toast.success('Template created and submitted for approval!');
      setShowCreateModal(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error(error.response?.data?.detail || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (templateSid) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    setDeleting(templateSid);
    try {
      await api.delete(`/customer/templates/${templateSid}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete template');
    } finally {
      setDeleting(null);
    }
  };

  const viewDetail = async (template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      friendly_name: '',
      language: 'en',
      category: 'MARKETING',
      template_type: 'twilio/text',
      body: '',
      header_text: '',
      footer_text: '',
      button_text: '',
      button_url: ''
    });
  };

  const getStatusBadge = (status) => {
    if (!status) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          <Clock className="h-3 w-3" />
          Not Submitted
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'pending':
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            <AlertCircle className="h-3 w-3" />
            {status}
          </span>
        );
    }
  };

  const getCategoryBadge = (types) => {
    const typeKey = Object.keys(types || {})[0];
    if (!typeKey) return null;

    const colors = {
      'twilio/text': 'bg-blue-100 text-blue-700',
      'twilio/media': 'bg-purple-100 text-purple-700',
      'twilio/call-to-action': 'bg-orange-100 text-orange-700',
      'twilio/quick-reply': 'bg-teal-100 text-teal-700'
    };

    return (
      <span className={`px-2 py-0.5 text-xs rounded ${colors[typeKey] || 'bg-gray-100 text-gray-700'}`}>
        {typeKey.replace('twilio/', '')}
      </span>
    );
  };

  const getTemplateBody = (types) => {
    if (!types) return '';
    const typeData = Object.values(types)[0];
    return typeData?.body || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
          <p className="text-gray-500">
            Manage your WhatsApp message templates
            {accountSid && <span className="ml-2 text-xs text-gray-400">(Account: {accountSid})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">About WhatsApp Templates</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Templates must be approved by WhatsApp before use (usually 24-48 hours)</li>
              <li>Use variables like <code className="bg-blue-100 px-1 rounded">{'{{1}}'}</code>, <code className="bg-blue-100 px-1 rounded">{'{{2}}'}</code> for dynamic content</li>
              <li>Categories: MARKETING (promotions), UTILITY (updates), AUTHENTICATION (OTPs)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Templates Yet</h3>
          <p className="text-gray-500 mb-4">Create your first WhatsApp template to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.sid} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{template.friendly_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{template.sid}</p>
                </div>
                {getStatusBadge(template.approval_status)}
              </div>

              <div className="flex items-center gap-2 mb-3">
                {getCategoryBadge(template.types)}
                <span className="text-xs text-gray-500">{template.language?.toUpperCase()}</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 min-h-[80px]">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {getTemplateBody(template.types) || 'No body content'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Created: {template.date_created ? new Date(template.date_created).toLocaleDateString() : 'N/A'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => viewDetail(template)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.sid)}
                    disabled={deleting === template.sid}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Delete"
                  >
                    {deleting === template.sid ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New Template</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Template Name */}
              <div>
                <label className="label">Template Name *</label>
                <input
                  type="text"
                  value={formData.friendly_name}
                  onChange={(e) => setFormData({ ...formData, friendly_name: e.target.value })}
                  placeholder="e.g., order_confirmation"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase letters, numbers, and underscores only</p>
              </div>

              {/* Language & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="input"
                  >
                    <option value="en">English</option>
                    <option value="en_US">English (US)</option>
                    <option value="hi">Hindi</option>
                    <option value="gu">Gujarati</option>
                    <option value="mr">Marathi</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                  </select>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                </div>
              </div>

              {/* Template Type */}
              <div>
                <label className="label">Template Type</label>
                <select
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                  className="input"
                >
                  <option value="twilio/text">Text Only</option>
                  <option value="twilio/media">Media (Image/Video)</option>
                  <option value="twilio/call-to-action">Call to Action (Button)</option>
                </select>
              </div>

              {/* Message Body */}
              <div>
                <label className="label">Message Body *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Hello {{1}}, your order #{{2}} has been confirmed. Thank you for shopping with us!"
                  rows={4}
                  className="input resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{{1}}'}, {'{{2}}'}, etc. for variables that will be replaced with actual values
                </p>
              </div>

              {/* Call to Action Fields */}
              {formData.template_type === 'twilio/call-to-action' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
                  <div>
                    <label className="label">Button Text</label>
                    <input
                      type="text"
                      value={formData.button_text}
                      onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                      placeholder="View Order"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Button URL</label>
                    <input
                      type="url"
                      value={formData.button_url}
                      onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                      placeholder="https://example.com/order/{{1}}"
                      className="input"
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <label className="label">Preview</label>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="bg-white rounded-lg p-3 shadow-sm max-w-xs">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {formData.body || 'Your message will appear here...'}
                    </p>
                    {formData.template_type === 'twilio/call-to-action' && formData.button_text && (
                      <button className="mt-2 w-full py-2 bg-blue-500 text-white text-sm rounded-lg">
                        {formData.button_text}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit for Approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Template Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTemplate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Template Name</label>
                  <p className="font-medium">{selectedTemplate.friendly_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">SID</label>
                  <p className="font-mono text-sm">{selectedTemplate.sid}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Language</label>
                  <p>{selectedTemplate.language?.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedTemplate.approval_status)}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Created</label>
                  <p>{selectedTemplate.date_created ? new Date(selectedTemplate.date_created).toLocaleString() : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Updated</label>
                  <p>{selectedTemplate.date_updated ? new Date(selectedTemplate.date_updated).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Type</label>
                <div className="mt-1">{getCategoryBadge(selectedTemplate.types)}</div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Body</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{getTemplateBody(selectedTemplate.types)}</p>
                </div>
              </div>

              {selectedTemplate.variables && Object.keys(selectedTemplate.variables).length > 0 && (
                <div>
                  <label className="text-xs text-gray-500">Variables</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(selectedTemplate.variables).map(([key, value]) => (
                      <span key={key} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {'{{'}{key}{'}} - '}{value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.approval_requests?.whatsapp && (
                <div>
                  <label className="text-xs text-gray-500">Approval Details</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(selectedTemplate.approval_requests.whatsapp, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTemplate(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
