import { useEffect, useState } from 'react';
import api from '../../api/axios';
import {
  Users,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, customersRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/customers?limit=5'),
      ]);

      setStats(statsRes.data);
      setRecentCustomers(customersRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.total_customers || 0,
      icon: Users,
      color: 'blue',
      subtext: `${stats?.active_customers || 0} active`,
    },
    {
      title: 'Total Revenue',
      value: `₹${stats?.revenue_rupees?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'green',
      subtext: 'All time',
    },
    {
      title: 'Total Messages',
      value: stats?.total_messages || 0,
      icon: MessageSquare,
      color: 'purple',
      subtext: `${stats?.messages_today || 0} today`,
    },
    {
      title: 'Messages Today',
      value: stats?.messages_today || 0,
      icon: TrendingUp,
      color: 'orange',
      subtext: 'Last 24 hours',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Overview of your business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                </div>
                <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/customers"
          className="card hover:border-blue-300 transition-colors group flex items-center gap-4"
        >
          <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Manage Customers</h3>
            <p className="text-sm text-gray-500">View and manage users</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          to="/admin/pricing"
          className="card hover:border-green-300 transition-colors group flex items-center gap-4"
        >
          <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Pricing</h3>
            <p className="text-sm text-gray-500">Configure message rates</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          to="/admin/settings"
          className="card hover:border-purple-300 transition-colors group flex items-center gap-4"
        >
          <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors">
            <MessageSquare className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">API Settings</h3>
            <p className="text-sm text-gray-500">Configure integrations</p>
          </div>
          <ArrowUpRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      {/* Recent Customers */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Customers</h2>
          <Link to="/admin/customers" className="text-sm text-blue-600 hover:text-blue-700">
            View all
          </Link>
        </div>

        {recentCustomers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No customers yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {customer.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">{customer.email}</td>
                    <td className="py-3 font-medium">₹{(customer.balance / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          customer.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
