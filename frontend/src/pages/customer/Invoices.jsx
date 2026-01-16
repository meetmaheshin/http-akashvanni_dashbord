import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FileText, Download, Loader2, Receipt, Calendar, IndianRupee } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/payments/invoices');
      setInvoices(res.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const res = await api.get(`/payments/invoices/${invoiceId}/download`, {
        responseType: 'text',
      });

      // Open in new tab for printing
      const newWindow = window.open();
      newWindow.document.write(res.data);
      newWindow.document.close();
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500">View and download your payment invoices</p>
      </div>

      {invoices.length === 0 ? (
        <div className="card text-center py-12">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
          <p className="text-gray-500">
            Your invoices will appear here after you make a payment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Invoice #{invoice.invoice_number}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(invoice.payment_date || invoice.created_at)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{invoice.total_rupees?.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => downloadInvoice(invoice.id, invoice.invoice_number)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Subtotal</p>
                  <p className="font-medium">₹{invoice.subtotal_rupees?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">CGST (9%)</p>
                  <p className="font-medium">₹{invoice.cgst_rupees?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">SGST (9%)</p>
                  <p className="font-medium">₹{invoice.sgst_rupees?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Wallet Credit</p>
                  <p className="font-medium text-green-600">₹{invoice.credited_rupees?.toFixed(2)}</p>
                </div>
              </div>

              {invoice.customer_gst && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <span className="text-gray-500">Your GSTIN: </span>
                  <span className="font-medium">{invoice.customer_gst}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="card mt-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <IndianRupee className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">About GST on Payments</h3>
            <p className="text-sm text-blue-700 mt-1">
              All payments include 18% GST (9% CGST + 9% SGST). The amount credited to your wallet
              is the base amount after GST deduction. For example, if you pay ₹1000, approximately
              ₹847 is credited to your wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
