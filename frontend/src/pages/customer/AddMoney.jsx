import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Wallet, CreditCard, Loader2, Check, X, FileText, AlertCircle, Calculator, ArrowRight } from 'lucide-react';

const presetAmounts = [100, 200, 500, 1000, 2000, 5000];

// Quick balance amounts - what customer wants to receive
const quickBalanceAmounts = [100, 500, 1000, 2000, 5000];

export default function AddMoney() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [showGstPopup, setShowGstPopup] = useState(false);
  const [gstCheckDone, setGstCheckDone] = useState(false);

  useEffect(() => {
    fetchPricing();
    loadRazorpayScript();
  }, []);

  const fetchPricing = async () => {
    try {
      const res = await api.get('/customer/pricing');
      setPricing(res.data);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    }
  };

  const loadRazorpayScript = () => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const checkGstStatus = async () => {
    try {
      const res = await api.get('/payments/check-gst');
      return res.data;
    } catch (error) {
      return { has_gst: false, gst_prompt_shown: true };
    }
  };

  const markGstPromptShown = async () => {
    try {
      await api.post('/payments/mark-gst-prompt-shown');
    } catch (error) {
      console.error('Failed to mark GST prompt shown:', error);
    }
  };

  const calculateGstBreakdown = (amountRupees) => {
    const totalPaise = amountRupees * 100;
    const subtotal = Math.round(totalPaise / 1.18);
    const gst = totalPaise - subtotal;
    return {
      subtotal: subtotal / 100,
      gst: gst / 100,
      total: amountRupees,
      credited: subtotal / 100,
    };
  };

  // Calculate how much to pay to get desired balance
  const calculatePaymentForBalance = (desiredBalance) => {
    // If customer wants ₹100 in wallet, they need to pay ₹100 * 1.18 = ₹118
    const paymentNeeded = Math.ceil(desiredBalance * 1.18);
    return paymentNeeded;
  };

  const handlePayment = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 1) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Check GST status before first payment
    if (!gstCheckDone) {
      const gstStatus = await checkGstStatus();
      if (!gstStatus.has_gst && !gstStatus.gst_prompt_shown) {
        setShowGstPopup(true);
        return;
      }
      setGstCheckDone(true);
    }

    proceedWithPayment(amountNum);
  };

  const handleGstPopupChoice = async (addGst) => {
    setShowGstPopup(false);
    await markGstPromptShown();
    setGstCheckDone(true);

    if (addGst) {
      navigate('/profile');
      toast.success('Please add your GST details for invoicing');
    } else {
      const amountNum = parseInt(amount);
      if (amountNum && amountNum >= 1) {
        proceedWithPayment(amountNum);
      }
    }
  };

  const proceedWithPayment = async (amountNum) => {
    setLoading(true);

    try {
      // Create order
      const orderRes = await api.post('/payments/create-order', {
        amount: amountNum,
      });

      const { order_id, amount: amountPaise, key_id } = orderRes.data;
      const gstBreakdown = calculateGstBreakdown(amountNum);

      // Open Razorpay
      const options = {
        key: key_id,
        amount: amountPaise,
        currency: 'INR',
        name: 'TwoZero - WhatsApp Services',
        description: `Wallet Recharge - ₹${amountNum} (₹${gstBreakdown.credited.toFixed(2)} + GST)`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyRes = await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(verifyRes.data.message || `₹${gstBreakdown.credited.toFixed(2)} added to your wallet!`);
            refreshUser();
            setAmount('');
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        theme: {
          color: '#2563eb',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const gstBreakdown = amount ? calculateGstBreakdown(parseInt(amount) || 0) : null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* GST Popup Modal */}
      {showGstPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">GST Invoice</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Do you want to receive GST invoices for your payments? If yes, please add your
              company GSTIN in your profile.
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> All payments include 18% GST. Adding your GSTIN will
                enable you to claim input tax credit.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleGstPopupChoice(true)}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Yes, Add GST Details
              </button>
              <button
                onClick={() => handleGstPopupChoice(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Money</h1>
        <p className="text-gray-500">Recharge your wallet to send messages</p>
      </div>

      {/* Current Balance */}
      <div className="card mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-blue-100">Current Balance</p>
            <p className="text-3xl font-bold">
              ₹{(user?.balance / 100 || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Info */}
      {pricing && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Message Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Template Message</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{pricing.template_price_rupees.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Session Message (24hr)</p>
              <p className="text-xl font-bold text-gray-900">
                ₹{pricing.session_price_rupees.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Amount Selection */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Select Amount</h3>

        {/* Preset Amounts */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              className={`py-3 rounded-lg font-medium transition-all ${
                amount === preset.toString()
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ₹{preset}
            </button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="mb-6">
          <label className="label">Or enter custom amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-8"
              placeholder="Enter amount"
              min="1"
            />
          </div>
        </div>

        {/* Quick Balance Calculator */}
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Want exact balance in wallet?</h4>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Click to auto-calculate payment amount (includes 18% GST)
          </p>

          <div className="grid grid-cols-5 gap-2">
            {quickBalanceAmounts.map((balance) => {
              const payAmount = calculatePaymentForBalance(balance);
              return (
                <button
                  key={balance}
                  onClick={() => setAmount(payAmount.toString())}
                  className={`relative p-3 rounded-lg border transition-all text-center ${
                    amount === payAmount.toString()
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-200 hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  <div className={`text-xs ${amount === payAmount.toString() ? 'text-green-100' : 'text-gray-500'}`}>
                    Get
                  </div>
                  <div className={`font-bold ${amount === payAmount.toString() ? 'text-white' : 'text-green-700'}`}>
                    ₹{balance}
                  </div>
                  <div className={`text-xs mt-1 ${amount === payAmount.toString() ? 'text-green-100' : 'text-gray-500'}`}>
                    Pay ₹{payAmount}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Example: Pay ₹118 to get ₹100 balance (₹18 GST)
          </div>
        </div>

        {/* GST Breakdown */}
        {gstBreakdown && gstBreakdown.total > 0 && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-gray-900">Payment Breakdown</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service Amount</span>
                <span className="font-medium">₹{gstBreakdown.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-medium">₹{gstBreakdown.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-900 font-medium">Total Payment</span>
                <span className="font-bold text-gray-900">₹{gstBreakdown.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span className="font-medium">Wallet Credit</span>
                <span className="font-bold">₹{gstBreakdown.credited.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading || !amount}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              Pay ₹{amount || '0'}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Secure payment powered by Razorpay
        </p>
      </div>
    </div>
  );
}
