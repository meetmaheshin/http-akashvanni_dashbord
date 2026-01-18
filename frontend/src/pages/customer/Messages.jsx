import { useEffect, useState, useMemo, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Loader2,
  Search,
  Check,
  CheckCheck,
  Clock,
  XCircle,
  Phone,
  ArrowLeft,
  Send
} from 'lucide-react';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [filter, setFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    setSending(true);
    try {
      const res = await api.post('/customer/send-message', {
        recipient_phone: selectedContact,
        message_content: newMessage.trim(),
        message_type: 'session'
      });

      // Add new message to list
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      toast.success('Message sent!');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/customer/messages?limit=500');
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group messages by contact (phone number)
  const contacts = useMemo(() => {
    const contactMap = new Map();

    messages.forEach((msg) => {
      const phone = msg.recipient_phone;
      if (!contactMap.has(phone)) {
        contactMap.set(phone, {
          phone,
          name: msg.recipient_name || phone,
          messages: [],
          lastMessage: null,
          unreadCount: 0,
        });
      }
      const contact = contactMap.get(phone);
      contact.messages.push(msg);

      // Update last message
      if (!contact.lastMessage || new Date(msg.created_at) > new Date(contact.lastMessage.created_at)) {
        contact.lastMessage = msg;
      }
    });

    // Sort messages within each contact by date
    contactMap.forEach((contact) => {
      contact.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });

    // Convert to array and sort by last message date
    return Array.from(contactMap.values()).sort(
      (a, b) => new Date(b.lastMessage?.created_at) - new Date(a.lastMessage?.created_at)
    );
  }, [messages]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Get messages for selected contact with filter
  const selectedMessages = useMemo(() => {
    if (!selectedContact) return [];
    const contact = contacts.find((c) => c.phone === selectedContact);
    if (!contact) return [];

    if (filter === 'all') return contact.messages;
    return contact.messages.filter((msg) => msg.status === filter);
  }, [selectedContact, contacts, filter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'read':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  // Group messages by date
  const messagesByDate = useMemo(() => {
    const groups = [];
    let currentDate = null;

    selectedMessages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    });

    return groups;
  }, [selectedMessages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedContactData = contacts.find((c) => c.phone === selectedContact);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">WhatsApp message history</p>
      </div>

      <div className="flex-1 flex bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Contacts List - Left Side */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${
            selectedContact ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Header */}
          <div className="p-3 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No contacts found</p>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.phone}
                  onClick={() => setSelectedContact(contact.phone)}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                    selectedContact === contact.phone ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {contact.lastMessage && formatTime(contact.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {contact.lastMessage && (
                        <>
                          <span className={getStatusColor(contact.lastMessage.status)}>
                            {getStatusIcon(contact.lastMessage.status)}
                          </span>
                          <p className="text-sm text-gray-500 truncate">
                            {contact.lastMessage.message_content ||
                              contact.lastMessage.template_name ||
                              'Template message'}
                          </p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{contact.phone}</p>
                  </div>

                  {/* Message Count */}
                  <div className="flex-shrink-0">
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {contact.messages.length}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area - Right Side */}
        <div
          className={`flex-1 flex flex-col ${
            selectedContact ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedContact && selectedContactData ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b bg-gray-50 flex items-center gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1 hover:bg-gray-200 rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {selectedContactData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedContactData.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedContactData.phone}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-500">{selectedContactData.messages.length} messages</p>
                  <p className="text-gray-400">
                    ₹{selectedContactData.messages.reduce((sum, m) => sum + (m.cost_rupees || 0), 0).toFixed(2)} spent
                  </p>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="p-2 border-b bg-white flex gap-1 overflow-x-auto">
                {['all', 'pending', 'sent', 'delivered', 'read', 'failed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                      filter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                {messagesByDate.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No messages with this filter</p>
                  </div>
                ) : (
                  messagesByDate.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      {/* Date Separator */}
                      <div className="flex justify-center mb-4">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs text-gray-500 shadow-sm">
                          {formatMessageDate(group.date)}
                        </span>
                      </div>

                      {/* Messages for this date */}
                      <div className="space-y-2">
                        {group.messages.map((msg) => {
                          // Determine if message is outbound (sent by us) or inbound (received)
                          const isOutbound = msg.direction !== 'inbound';

                          return (
                            <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[75%] rounded-lg p-3 shadow-sm ${
                                  msg.status === 'failed'
                                    ? 'bg-red-100 border border-red-200'
                                    : isOutbound
                                    ? 'bg-green-100 rounded-tr-none'
                                    : 'bg-white rounded-tl-none border'
                                }`}
                              >
                                {/* Template Badge */}
                                {msg.template_name && (
                                  <div className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {msg.template_name}
                                  </div>
                                )}

                                {/* Message Content */}
                                <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                  {msg.message_content || 'Template message sent'}
                                </p>

                                {/* Error Message */}
                                {msg.error_message && (
                                  <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {msg.error_message}
                                  </p>
                                )}

                                {/* Footer */}
                                <div className={`flex items-center gap-2 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                  {msg.cost_rupees > 0 && (
                                    <span className="text-xs text-gray-500">
                                      ₹{msg.cost_rupees?.toFixed(2)}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  {isOutbound && (
                                    <span className={getStatusColor(msg.status)}>
                                      {getStatusIcon(msg.status)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-3 border-t bg-gray-50">
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-white rounded-lg border focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 text-sm resize-none focus:outline-none rounded-lg"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className={`p-3 rounded-full transition-colors ${
                      sending || !newMessage.trim()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Messages are sent via WhatsApp Business API
                </p>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">Your Messages</h3>
                <p className="text-gray-500 max-w-sm">
                  Select a contact from the list to view message history
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
