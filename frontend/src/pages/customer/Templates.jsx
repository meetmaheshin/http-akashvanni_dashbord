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
  ArrowLeft,
  Send,
  RefreshCw,
  Type,
  Image,
  Phone,
  MessageSquare,
  List,
  ThumbsUp,
  CreditCard,
  LayoutGrid,
  Shield,
  Workflow
} from 'lucide-react';

// Template type options with icons
const TEMPLATE_TYPES = [
  { id: 'twilio/text', name: 'Text', icon: Type, description: 'Simple text message' },
  { id: 'twilio/media', name: 'Media', icon: Image, description: 'Image, video, or document' },
  { id: 'twilio/list-picker', name: 'List Picker', icon: List, description: 'Interactive list selection' },
  { id: 'twilio/call-to-action', name: 'Call to Action', icon: Phone, description: 'Buttons with URL or phone' },
  { id: 'twilio/quick-reply', name: 'Quick Reply', icon: ThumbsUp, description: 'Quick response buttons' },
  { id: 'twilio/card', name: 'Card', icon: CreditCard, description: 'Rich card with image and buttons' },
  { id: 'twilio/catalog', name: 'Catalog', icon: LayoutGrid, description: 'Product catalog' },
  { id: 'twilio/carousel', name: 'Carousel', icon: LayoutGrid, description: 'Multiple cards carousel' },
  { id: 'twilio/whatsapp-card', name: 'WhatsApp Card', icon: MessageSquare, description: 'WhatsApp specific card' },
  { id: 'twilio/whatsapp-authentication', name: 'Authentication', icon: Shield, description: 'OTP and verification' },
  { id: 'twilio/flows', name: 'Flows', icon: Workflow, description: 'Interactive flows' },
];

const CATEGORIES = [
  { id: 'MARKETING', name: 'Marketing', description: 'Promotional messages, offers, updates' },
  { id: 'UTILITY', name: 'Utility', description: 'Order updates, account alerts, confirmations' },
  { id: 'AUTHENTICATION', name: 'Authentication', description: 'OTPs, verification codes, login alerts' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountSid, setAccountSid] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'create' or 'detail'
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
    // Call to action
    button_text: '',
    button_url: '',
    button_phone: '',
    // Quick reply
    quick_replies: ['', '', ''],
    // Media
    media_url: '',
    // List picker
    list_items: [{ title: '', description: '' }],
    // Sample values for variables
    variable_samples: {},
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

    // Check if all variables have sample values
    const variables = getVariablesFromBody(formData.body);
    const missingSamples = variables.filter(v => !formData.variable_samples[v]?.trim());

    if (missingSamples.length > 0) {
      toast.error(`Please provide sample values for variables: ${missingSamples.map(v => `{{${v}}}`).join(', ')}`);
      return;
    }

    setCreating(true);
    try {
      await api.post('/customer/templates', formData);
      toast.success('Template created and submitted for approval!');
      setView('list');
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

  const viewDetail = (template) => {
    setSelectedTemplate(template);
    setView('detail');
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
      button_url: '',
      button_phone: '',
      quick_replies: ['', '', ''],
      media_url: '',
      list_items: [{ title: '', description: '' }],
      variable_samples: {},
    });
  };

  // Extract variables from body text
  const getVariablesFromBody = (body) => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)].map(v => v.replace(/[{}]/g, '')).sort((a, b) => a - b);
  };

  // Update variable sample value
  const updateVariableSample = (varNum, value) => {
    setFormData(prev => ({
      ...prev,
      variable_samples: {
        ...prev.variable_samples,
        [varNum]: value
      }
    }));
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

  const getTemplateBody = (types) => {
    if (!types) return '';
    const typeData = Object.values(types)[0];
    return typeData?.body || '';
  };

  const getTemplateTypeName = (types) => {
    if (!types) return 'Unknown';
    const typeKey = Object.keys(types)[0];
    const found = TEMPLATE_TYPES.find(t => t.id === typeKey);
    return found?.name || typeKey?.replace('twilio/', '') || 'Unknown';
  };

  const addQuickReply = () => {
    if (formData.quick_replies.length < 3) {
      setFormData({ ...formData, quick_replies: [...formData.quick_replies, ''] });
    }
  };

  const removeQuickReply = (index) => {
    const newReplies = formData.quick_replies.filter((_, i) => i !== index);
    setFormData({ ...formData, quick_replies: newReplies });
  };

  const updateQuickReply = (index, value) => {
    const newReplies = [...formData.quick_replies];
    newReplies[index] = value;
    setFormData({ ...formData, quick_replies: newReplies });
  };

  const addListItem = () => {
    setFormData({ ...formData, list_items: [...formData.list_items, { title: '', description: '' }] });
  };

  const removeListItem = (index) => {
    const newItems = formData.list_items.filter((_, i) => i !== index);
    setFormData({ ...formData, list_items: newItems });
  };

  const updateListItem = (index, field, value) => {
    const newItems = [...formData.list_items];
    newItems[index][field] = value;
    setFormData({ ...formData, list_items: newItems });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // CREATE TEMPLATE VIEW
  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => { setView('list'); resetForm(); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Template</h1>
            <p className="text-gray-500">Fill in the details to create a WhatsApp message template</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

              <div className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="input"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Description */}
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  {CATEGORIES.find(c => c.id === formData.category)?.description}
                </div>
              </div>
            </div>

            {/* Template Type Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Template Type</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TEMPLATE_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = formData.template_type === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, template_type: type.id })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {type.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Card */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Content</h2>

              <div className="space-y-4">
                {/* Header (optional) */}
                <div>
                  <label className="label">Header Text (Optional)</label>
                  <input
                    type="text"
                    value={formData.header_text}
                    onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
                    placeholder="Header text..."
                    className="input"
                  />
                </div>

                {/* Media URL for media types */}
                {(formData.template_type === 'twilio/media' || formData.template_type === 'twilio/card') && (
                  <div>
                    <label className="label">Media URL</label>
                    <input
                      type="url"
                      value={formData.media_url}
                      onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL to image, video, or document</p>
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="label">Message Body *</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Hello {{1}}, your order #{{2}} has been confirmed. Thank you for shopping with us!"
                    rows={5}
                    className="input resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{{1}}'}, {'{{2}}'}, etc. for variables that will be replaced with actual values
                  </p>
                </div>

                {/* Variable Sample Values - Required by WhatsApp */}
                {getVariablesFromBody(formData.body).length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-green-800">Sample Values Required</h3>
                        <p className="text-xs text-green-700 mt-1">
                          WhatsApp requires sample values for each variable to review your template.
                          These are example values that show how the variables will be used.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {getVariablesFromBody(formData.body).map(varNum => (
                        <div key={varNum} className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-mono rounded min-w-[60px] text-center">
                            {`{{${varNum}}}`}
                          </span>
                          <input
                            type="text"
                            value={formData.variable_samples[varNum] || ''}
                            onChange={(e) => updateVariableSample(varNum, e.target.value)}
                            placeholder={`Sample value for {{${varNum}}} (e.g., ${varNum === '1' ? 'John' : varNum === '2' ? '12345' : 'example'})`}
                            className="input flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                      Example: If your message is "Hello {'{{1}}'}, your order #{'{{2}}'} is ready",
                      sample values could be "John" and "ORD-12345"
                    </p>
                  </div>
                )}

                {/* Footer (optional) */}
                <div>
                  <label className="label">Footer Text (Optional)</label>
                  <input
                    type="text"
                    value={formData.footer_text}
                    onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                    placeholder="Footer text..."
                    className="input"
                  />
                </div>

                {/* Call to Action Buttons */}
                {formData.template_type === 'twilio/call-to-action' && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-4">
                    <h3 className="font-medium text-orange-800">Call to Action Buttons</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-600">Button Text</label>
                        <input
                          type="text"
                          value={formData.button_text}
                          onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                          placeholder="View Order"
                          className="input mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Button URL</label>
                        <input
                          type="url"
                          value={formData.button_url}
                          onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                          placeholder="https://example.com/order/{{1}}"
                          className="input mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        value={formData.button_phone}
                        onChange={(e) => setFormData({ ...formData, button_phone: e.target.value })}
                        placeholder="+919876543210"
                        className="input mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Quick Reply Buttons */}
                {formData.template_type === 'twilio/quick-reply' && (
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-teal-800">Quick Reply Buttons (Max 3)</h3>
                      {formData.quick_replies.length < 3 && (
                        <button
                          type="button"
                          onClick={addQuickReply}
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          + Add Button
                        </button>
                      )}
                    </div>
                    {formData.quick_replies.map((reply, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={reply}
                          onChange={(e) => updateQuickReply(index, e.target.value)}
                          placeholder={`Button ${index + 1} text`}
                          className="input flex-1"
                        />
                        {formData.quick_replies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuickReply(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* List Picker Items */}
                {formData.template_type === 'twilio/list-picker' && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-purple-800">List Items</h3>
                      <button
                        type="button"
                        onClick={addListItem}
                        className="text-sm text-purple-600 hover:text-purple-700"
                      >
                        + Add Item
                      </button>
                    </div>
                    {formData.list_items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateListItem(index, 'title', e.target.value)}
                            placeholder="Item title"
                            className="input"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateListItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            className="input"
                          />
                        </div>
                        {formData.list_items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeListItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded mt-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Authentication specific */}
                {formData.template_type === 'twilio/whatsapp-authentication' && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <h3 className="font-medium text-amber-800 mb-2">Authentication Template</h3>
                    <p className="text-sm text-amber-700">
                      For OTP and verification messages. The body should contain {'{{1}}'} for the OTP code.
                      Example: "Your verification code is {'{{1}}'}. Do not share this code."
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setView('list'); resetForm(); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
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

          {/* Preview - Right Side */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Preview</h2>

                {/* Phone mockup */}
                <div className="bg-gray-100 rounded-2xl p-4">
                  <div className="bg-green-600 rounded-t-xl p-3 flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-full"></div>
                    <span className="text-white font-medium text-sm">WhatsApp</span>
                  </div>
                  <div
                    className="bg-[#e5ddd5] min-h-[300px] p-3 rounded-b-xl"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4ccc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%]">
                      {/* Header */}
                      {formData.header_text && (
                        <p className="font-semibold text-sm text-gray-900 mb-1">
                          {formData.header_text}
                        </p>
                      )}

                      {/* Media placeholder */}
                      {(formData.template_type === 'twilio/media' || formData.template_type === 'twilio/card') && (
                        <div className="bg-gray-200 h-32 rounded-lg mb-2 flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Body */}
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {formData.body || 'Your message will appear here...'}
                      </p>

                      {/* Footer */}
                      {formData.footer_text && (
                        <p className="text-xs text-gray-500 mt-2">
                          {formData.footer_text}
                        </p>
                      )}

                      {/* Call to Action Button */}
                      {formData.template_type === 'twilio/call-to-action' && formData.button_text && (
                        <button className="mt-3 w-full py-2 bg-blue-500 text-white text-sm rounded-lg">
                          {formData.button_text}
                        </button>
                      )}

                      {/* Quick Reply Buttons */}
                      {formData.template_type === 'twilio/quick-reply' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {formData.quick_replies.filter(r => r.trim()).map((reply, i) => (
                            <button key={i} className="px-3 py-1 border border-blue-500 text-blue-500 text-xs rounded-full">
                              {reply}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* List Items */}
                      {formData.template_type === 'twilio/list-picker' && (
                        <div className="mt-3 border-t pt-2">
                          {formData.list_items.filter(item => item.title.trim()).map((item, i) => (
                            <div key={i} className="py-2 border-b last:border-b-0">
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-right mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variables detected */}
                {formData.body && formData.body.match(/\{\{\d+\}\}/g) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-700 mb-2">Variables detected:</p>
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(formData.body.match(/\{\{\d+\}\}/g))].map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (view === 'detail' && selectedTemplate) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => { setView('list'); setSelectedTemplate(null); }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.friendly_name}</h1>
            <p className="text-gray-500 font-mono text-sm">{selectedTemplate.sid}</p>
          </div>
          {getStatusBadge(selectedTemplate.approval_status)}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Template Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Language</label>
                <p className="font-medium">{selectedTemplate.language?.toUpperCase()}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Type</label>
                <p className="font-medium">{getTemplateTypeName(selectedTemplate.types)}</p>
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
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Message Body</h2>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="whitespace-pre-wrap">{getTemplateBody(selectedTemplate.types)}</p>
            </div>
          </div>

          {selectedTemplate.variables && Object.keys(selectedTemplate.variables).length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Variables</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedTemplate.variables).map(([key, value]) => (
                  <span key={key} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {'{{'}{key}{'}} → '}{value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedTemplate.approval_requests?.whatsapp && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Approval Details</h2>
              <pre className="p-4 bg-gray-50 rounded-lg text-xs overflow-auto">
                {JSON.stringify(selectedTemplate.approval_requests.whatsapp, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => { setView('list'); setSelectedTemplate(null); }}
              className="btn-secondary flex-1"
            >
              Back to List
            </button>
            <button
              onClick={() => handleDelete(selectedTemplate.sid)}
              disabled={deleting === selectedTemplate.sid}
              className="btn-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
            >
              {deleting === selectedTemplate.sid ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Template
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW (Default)
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
            onClick={() => setView('create')}
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
            onClick={() => setView('create')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.sid} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => viewDetail(template)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{template.friendly_name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{template.sid?.slice(0, 15)}...</p>
                </div>
                {getStatusBadge(template.approval_status)}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                  {getTemplateTypeName(template.types)}
                </span>
                <span className="text-xs text-gray-500">{template.language?.toUpperCase()}</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 min-h-[80px]">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {getTemplateBody(template.types) || 'No body content'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {template.date_created ? new Date(template.date_created).toLocaleDateString() : 'N/A'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); viewDetail(template); }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(template.sid); }}
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
    </div>
  );
}
