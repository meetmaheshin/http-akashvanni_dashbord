import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Users,
  Info
} from 'lucide-react';

export default function ImportMessages() {
  const [customers, setCustomers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [result, setResult] = useState(null);
  const [deductBalance, setDeductBalance] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/admin/customers?limit=100');
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedUserId) {
      toast.error('Please select a customer');
      return;
    }
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post(
        `/admin/import-messages/${selectedUserId}?deduct_balance=${deductBalance}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setResult({
        success: true,
        imported: res.data.imported,
        skipped: res.data.skipped,
        templateCount: res.data.template_count,
        sessionCount: res.data.session_count,
        totalCost: res.data.total_cost_rupees,
        balanceDeducted: res.data.balance_deducted,
      });
      toast.success(`Imported ${res.data.imported} messages`);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      const errorMsg = error.response?.data?.detail || 'Import failed';
      setResult({
        success: false,
        error: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedUserId));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Messages</h1>
        <p className="text-gray-500">Import WhatsApp messages from CSV for a customer</p>
      </div>

      <div className="card max-w-2xl">
        {/* Customer Selection */}
        <div className="mb-6">
          <label className="label">Select Customer</label>
          {loadingCustomers ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading customers...
            </div>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input"
            >
              <option value="">-- Select a customer --</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.email}) - ID: {customer.id}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Info */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Pricing from CSV</p>
              <p className="text-sm text-amber-700 mt-1">
                Message pricing is determined by the <code className="bg-amber-100 px-1 rounded">Type</code> column in your CSV:
              </p>
              <div className="flex gap-4 mt-2">
                <div className="text-sm">
                  <span className="font-medium text-blue-700">template</span> = ₹2.00
                </div>
                <div className="text-sm">
                  <span className="font-medium text-green-700">session</span> = ₹1.00
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deduct Balance Option */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deductBalance}
              onChange={(e) => setDeductBalance(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-gray-900">Deduct balance from customer</span>
              <p className="text-sm text-gray-500">Uncheck if messages were already charged</p>
            </div>
          </label>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="label">CSV File</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to select CSV file</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Supports Twilio/WhatsApp message export format
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* CSV Format Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Expected CSV columns:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li><code className="bg-gray-200 px-1 rounded">MessageSid</code> - Unique message ID</li>
            <li><code className="bg-gray-200 px-1 rounded">Direction</code> - inbound/outbound-api</li>
            <li><code className="bg-gray-200 px-1 rounded">From</code> - Sender phone (whatsapp:+91...)</li>
            <li><code className="bg-gray-200 px-1 rounded">To</code> - Recipient phone (whatsapp:+91...)</li>
            <li><code className="bg-gray-200 px-1 rounded">Body</code> - Message content</li>
            <li><code className="bg-gray-200 px-1 rounded">Status</code> - sent/delivered/read/failed</li>
            <li><code className="bg-gray-200 px-1 rounded">DateSent</code> - Timestamp</li>
            <li>
              <code className="bg-blue-100 text-blue-800 px-1 rounded font-medium">Type</code> -
              <span className="text-blue-700 font-medium"> template</span> (₹2) or
              <span className="text-green-700 font-medium"> session</span> (₹1)
            </li>
          </ul>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mb-6 p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Import Successful</p>
                    <p className="text-sm text-green-600">
                      {result.imported} messages imported, {result.skipped} skipped (duplicates)
                    </p>
                    {(result.templateCount > 0 || result.sessionCount > 0) && (
                      <p className="text-sm text-green-600 mt-1">
                        {result.templateCount > 0 && <span className="text-blue-700">{result.templateCount} template (₹2 each)</span>}
                        {result.templateCount > 0 && result.sessionCount > 0 && ' + '}
                        {result.sessionCount > 0 && <span className="text-green-700">{result.sessionCount} session (₹1 each)</span>}
                      </p>
                    )}
                    {result.balanceDeducted && (
                      <p className="text-sm text-green-700 font-medium mt-1">
                        ₹{result.totalCost?.toFixed(2)} deducted from customer balance
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Import Failed</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={loading || !selectedUserId || !file}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Import Messages
            </>
          )}
        </button>
      </div>
    </div>
  );
}
