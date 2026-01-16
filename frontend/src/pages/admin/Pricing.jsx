import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { DollarSign, Loader2, Save } from 'lucide-react';

export default function Pricing() {
  const [pricing, setPricing] = useState({
    template_price: 200,
    session_price: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await api.get('/admin/pricing');
      setPricing({
        template_price: res.data.template_price,
        session_price: res.data.session_price,
      });
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/pricing', {
        template_price: parseInt(pricing.template_price),
        session_price: parseInt(pricing.session_price),
      });
      toast.success('Pricing updated successfully');
    } catch (error) {
      toast.error('Failed to update pricing');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
        <p className="text-gray-500">Set message pricing for your customers</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-2 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Message Rates</h2>
            <p className="text-sm text-gray-500">Prices are stored in paise (100 paise = ₹1)</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Template Message Price */}
          <div>
            <label className="label">Template Message Price (in paise)</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={pricing.template_price}
                onChange={(e) =>
                  setPricing({ ...pricing, template_price: e.target.value })
                }
                className="input"
                min="0"
              />
              <div className="text-sm text-gray-500 whitespace-nowrap">
                = ₹{(pricing.template_price / 100).toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Template messages are sent outside the 24-hour window
            </p>
          </div>

          {/* Session Message Price */}
          <div>
            <label className="label">Session Message Price (in paise)</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={pricing.session_price}
                onChange={(e) =>
                  setPricing({ ...pricing, session_price: e.target.value })
                }
                className="input"
                min="0"
              />
              <div className="text-sm text-gray-500 whitespace-nowrap">
                = ₹{(pricing.session_price / 100).toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Session messages are sent within the 24-hour customer window
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Pricing Preview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Template Message</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{(pricing.template_price / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Session Message</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{(pricing.session_price / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

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
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
