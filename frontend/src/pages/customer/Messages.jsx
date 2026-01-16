import { useEffect, useState } from 'react';
import api from '../../api/axios';
import {
  MessageSquare,
  Loader2,
  Search,
  Check,
  CheckCheck,
  Clock,
  XCircle,
  Eye
} from 'lucide-react';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/customer/messages?limit=100');
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === 'all') return true;
    return msg.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4" />;
      case 'read':
        return <Eye className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'read':
        return 'bg-purple-100 text-purple-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">Track your WhatsApp message history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'sent', 'delivered', 'read', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="card">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {msg.recipient_name || msg.recipient_phone}
                      </p>
                      <p className="text-sm text-gray-500">{msg.recipient_phone}</p>
                      {msg.template_name && (
                        <p className="text-sm text-gray-400 mt-1">
                          Template: {msg.template_name}
                        </p>
                      )}
                      {msg.message_content && (
                        <p className="text-sm text-gray-600 mt-2 max-w-md truncate">
                          {msg.message_content}
                        </p>
                      )}
                      {msg.error_message && (
                        <p className="text-sm text-red-500 mt-2">
                          Error: {msg.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(
                        msg.status
                      )}`}
                    >
                      {getStatusIcon(msg.status)}
                      {msg.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      ₹{msg.cost_rupees?.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 ml-14 text-xs text-gray-400">
                  <span className="capitalize">{msg.message_type}</span>
                  {msg.sent_at && (
                    <span>Sent: {new Date(msg.sent_at).toLocaleTimeString()}</span>
                  )}
                  {msg.delivered_at && (
                    <span>
                      Delivered: {new Date(msg.delivered_at).toLocaleTimeString()}
                    </span>
                  )}
                  {msg.read_at && (
                    <span>Read: {new Date(msg.read_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
