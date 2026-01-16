import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { ArrowUpRight, ArrowDownRight, Loader2, Search } from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/admin/transactions?limit=100');
      setTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (filter === 'all') return true;
    return txn.type === filter;
  });

  // Calculate totals
  const totalCredits = transactions
    .filter((t) => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter((t) => t.type === 'debit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

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
        <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
        <p className="text-gray-500">View all payment and message transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Collected</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{(totalCredits / 100).toFixed(2)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Messages Value</p>
          <p className="text-2xl font-bold text-red-600">
            ₹{(totalDebits / 100).toFixed(2)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Net Balance Held</p>
          <p className="text-2xl font-bold text-blue-600">
            ₹{((totalCredits - totalDebits) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'credit', 'debit'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            {type === 'all' ? 'All' : type === 'credit' ? 'Credits' : 'Debits'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="card">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      txn.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {txn.type === 'credit' ? (
                      <ArrowDownRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {txn.description ||
                        (txn.type === 'credit' ? 'Wallet Recharge' : 'Message Sent')}
                    </p>
                    <p className="text-sm text-gray-500">
                      User ID: {txn.user_id} | {new Date(txn.created_at).toLocaleString()}
                    </p>
                    {txn.razorpay_payment_id && (
                      <p className="text-xs text-gray-400">
                        Payment ID: {txn.razorpay_payment_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-bold ${
                      txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount_rupees?.toFixed(2)}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      txn.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : txn.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
