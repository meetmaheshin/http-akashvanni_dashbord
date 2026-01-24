import { useEffect, useState } from 'react';
import api from '../../api/axios';
import {
  Clock,
  Send,
  CheckCheck,
  Eye,
  MessageCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Users,
  Zap,
  Filter,
  MessageSquare
} from 'lucide-react';

export default function CampaignOverview() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [timeRange, setTimeRange] = useState({
    startTime: '00:00',
    endTime: '23:59'
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCampaignStats();
  }, []);

  const fetchCampaignStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        start_date: `${dateRange.startDate}T${timeRange.startTime}:00`,
        end_date: `${dateRange.endDate}T${timeRange.endTime}:00`
      };

      const response = await api.get('/admin/campaign-overview', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch campaign stats:', error);
      setError(error.response?.data?.detail || 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    setTimeRange(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchCampaignStats();
  };

  const handleRefresh = () => {
    fetchCampaignStats();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(stats, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campaign-overview-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getStatusPercentage = (value, total) => {
    if (!total) return 0;
    return ((value / total) * 100).toFixed(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <div>
          <h3 className="font-medium text-red-900">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your WhatsApp message delivery status</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Report
          </button>
          <button
            onClick={handleExport}
            disabled={!stats}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
            <input
              type="time"
              name="startTime"
              value={timeRange.startTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
            <input
              type="time"
              name="endTime"
              value={timeRange.endTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleApplyFilters}
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            Apply
          </button>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : stats ? (
        <>
          {/* Quick Report */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Report</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* All */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Send className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">All</p>
                    <p className="text-sm font-semibold text-gray-900">
                      100% <span className="text-gray-400 font-normal">({stats.total_messages})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sent */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CheckCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sent</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getStatusPercentage(stats.sent, stats.total_messages)}% <span className="text-gray-400 font-normal">({stats.sent})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivered */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Delivered</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getStatusPercentage(stats.delivered, stats.total_messages)}% <span className="text-gray-400 font-normal">({stats.delivered})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Read */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Read</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getStatusPercentage(stats.read, stats.total_messages)}% <span className="text-gray-400 font-normal">({stats.read})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Replied */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Replied</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getStatusPercentage(stats.replied, stats.total_messages)}% <span className="text-gray-400 font-normal">({stats.replied})</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Failed */}
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getStatusPercentage(stats.failed, stats.total_messages)}% <span className="text-gray-400 font-normal">({stats.failed})</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Overview Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Campaign Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Campaign Status */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Campaign Status</p>
                    <p className={`text-sm font-bold ${stats.campaign_status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {stats.campaign_status}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-pink-500" />
                  </div>
                </div>
              </div>

              {/* Campaign Name */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Campaign name</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.campaign_name}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Trigger Campaign */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trigger Campaign</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.trigger_campaign}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Processed At */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Processed At</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(stats.processed_at)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Audience Type */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Audience Type</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.audience_type}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Filter className="h-4 w-4 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
              {/* Audience Size */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Audience Size</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.audience_size}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Messages</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.message_count}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Message Type */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Message Type</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.message_type}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Send className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Avg Delivery Time */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Avg Delivery</p>
                    <p className="text-sm font-semibold text-gray-900">{stats.avg_delivery_time}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
