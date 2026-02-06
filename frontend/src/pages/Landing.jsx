import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Zap,
  Shield,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Users,
  Send,
  Clock,
  Globe,
  Star,
  Sparkles,
  IndianRupee,
  TrendingUp,
  FileText,
  Bot,
  XCircle,
  ChevronDown,
  HelpCircle
} from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: Bot,
      title: 'AI-Powered Messages',
      description: 'Let AI craft personalized messages for each customer. Smarter communication, better engagement.',
      badge: 'AI'
    },
    {
      icon: MessageSquare,
      title: 'Bulk WhatsApp Messaging',
      description: 'Send thousands of messages instantly to your customers with just a few clicks.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast Delivery',
      description: 'Messages delivered in real-time with instant delivery confirmation.'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and secure API integration for your peace of mind.'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track delivery, read receipts, and engagement metrics in real-time.'
    },
    {
      icon: FileText,
      title: 'GST Compliant Invoices',
      description: 'Automatic GST compliant invoices for every payment. Download anytime.'
    }
  ];

  const stats = [
    { value: '10M+', label: 'Messages Sent' },
    { value: '5000+', label: 'Happy Customers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ];

  const testimonials = [
    {
      quote: "No monthly fees was a game changer for us. We only pay when we send messages. Akashvanni is perfect for seasonal businesses like ours.",
      author: "Rahul Sharma",
      role: "CEO, TechStart India",
      rating: 5
    },
    {
      quote: "The AI-powered messaging saves us hours every week. Our customer engagement has improved by 3x since switching.",
      author: "Priya Patel",
      role: "Marketing Head, RetailPro",
      rating: 5
    },
    {
      quote: "GST compliant invoicing and pay-as-you-go pricing made this a no-brainer for our business. No more monthly subscriptions!",
      author: "Amit Kumar",
      role: "Founder, EcomBiz",
      rating: 5
    }
  ];

  const comparisonFeatures = [
    { feature: 'Monthly Subscription', us: false, others: true },
    { feature: 'AI-Powered Messages', us: true, others: false },
    { feature: 'Pay Only for What You Use', us: true, others: false },
    { feature: 'GST Compliant Invoices', us: true, others: 'Some' },
    { feature: 'Bulk Discount Pricing', us: true, others: 'Limited' },
    { feature: 'Real-time Analytics', us: true, others: true },
  ];

  const faqs = [
    {
      question: "Is there any automation with WhatsApp?",
      answer: "Yes! WhatsApp Business API allows full automation including bulk messaging, auto-replies, AI-powered chatbots, and scheduled campaigns. Akashvanni provides the official WhatsApp Business API with an easy-to-use dashboard - no coding required. You can automate marketing messages, customer support, order notifications, and more."
    },
    {
      question: "What is the best WhatsApp automation tool for small businesses?",
      answer: "Akashvanni is built specifically for Indian small businesses. Unlike other tools that charge ₹2,000-₹10,000/month in subscription fees, Akashvanni has ZERO monthly fees - you only pay per message starting at just ₹2. Plus, the more messages you send, the cheaper it gets (as low as ₹1/message for 10,000+ messages). We also provide AI-powered message generation, GST compliant invoices, and real-time analytics."
    },
    {
      question: "How much does WhatsApp Business API cost in India?",
      answer: "With Akashvanni, there's no setup fee and no monthly subscription. You pay only for messages you send: Marketing messages start at ₹2.00 and Utility messages at ₹1.00. Volume discounts apply automatically - send 10,000+ messages/month and pay as low as ₹1.00 for marketing and ₹0.25 for utility messages. Pricing resets on the 1st of every month."
    },
    {
      question: "Can I automate WhatsApp messages with AI?",
      answer: "Absolutely! Akashvanni includes built-in AI-powered message generation. Our AI can craft personalized messages for each customer, improving engagement rates by up to 3x. Simply describe what you want to communicate, and our AI creates professional, engaging messages in seconds. Works for marketing campaigns, customer support, and transactional notifications."
    },
    {
      question: "Is WhatsApp automation safe? Will my account get banned?",
      answer: "Akashvanni uses the official WhatsApp Business API approved by Meta, which means zero risk of account bans. Unlike unofficial tools that use WhatsApp Web scraping (which can get your number blocked), our API integration is 100% compliant with WhatsApp's policies. Your messages are delivered reliably with 99.9% uptime."
    },
    {
      question: "How to send bulk WhatsApp messages without getting blocked?",
      answer: "The only safe way to send bulk WhatsApp messages is through the official WhatsApp Business API. Akashvanni provides this API access with no monthly fees. You can send thousands of messages instantly with proper template approval from Meta. Our platform handles message queuing, delivery optimization, and compliance automatically."
    },
    {
      question: "What's the difference between WhatsApp Business App and WhatsApp Business API?",
      answer: "WhatsApp Business App is free but limited - you can only send messages manually, one at a time. WhatsApp Business API (what Akashvanni provides) allows bulk messaging, automation, AI chatbots, CRM integration, and analytics. The API is essential for businesses sending more than 50 messages/day or needing automated workflows."
    },
    {
      question: "Do I need a monthly subscription for WhatsApp automation?",
      answer: "Not with Akashvanni! Most WhatsApp automation platforms charge ₹2,000-₹15,000/month regardless of usage. Akashvanni is India's only pay-per-message platform with ZERO monthly fees. You add balance to your wallet and pay only when you send messages. No commitments, no lock-ins, no wasted money on unused subscriptions."
    },
    {
      question: "Which WhatsApp automation tool is cheapest for high volume messaging?",
      answer: "Akashvanni offers the most competitive volume pricing in India. At 10,000+ messages/month, marketing messages cost just ₹1.00 each and utility messages just ₹0.25 each - that's up to 75% cheaper than most competitors. Plus, there's no monthly subscription eating into your budget. Your volume discount resets monthly, so every month is a fresh start."
    },
    {
      question: "How do I get started with WhatsApp Business API?",
      answer: "Getting started with Akashvanni is simple: 1) Create a free account - no credit card required, 2) Add balance to your wallet (start with as little as ₹100), 3) Start sending AI-powered messages. We handle all the Meta/WhatsApp approval process for you. Most businesses are up and running within 24 hours."
    },
  ];

  const [openFaq, setOpenFaq] = useState(null);

  // Inject FAQ Schema (JSON-LD) for SEO
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    script.id = 'faq-schema';
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('faq-schema');
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src="/site_logo.png" alt="Akashvanni" className="h-10" />
              <span className="text-xl font-bold text-gray-800">Akashvanni</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-green-600 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-green-600 transition-colors">Pricing</a>
              <a href="#compare" className="text-gray-600 hover:text-green-600 transition-colors">Why Us</a>
              <a href="#faq" className="text-gray-600 hover:text-green-600 transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="/portal.html" className="text-gray-600 hover:text-green-600 transition-colors font-medium">
                Customer Portal
              </a>
              <Link
                to="/register"
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* USP Banner */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">No Monthly Commitment!</span>
            <span className="text-green-100">Unlike other platforms, we charge only for messages you send. Zero subscription fees.</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-16 pb-20 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -right-40 w-96 h-96 bg-green-400/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -left-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* AI Badge */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Bot className="w-4 h-4" />
                AI-Powered WhatsApp Automation
              </div>

              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Trusted by 5000+ businesses across India
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6">
                The #1{' '}
                <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  WhatsApp
                </span>
                <br />
                Automation Platform
              </h1>

              <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                AI-powered messaging that helps you reach customers instantly on WhatsApp.
                Smart, automated, and incredibly effective.
              </p>

              {/* Key USP */}
              <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-full">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">No Monthly Fees</span>
                </div>
                <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-4 py-2 rounded-full">
                  <Bot className="w-5 h-5" />
                  <span className="font-medium">AI-Powered</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-4 py-2 rounded-full">
                  <IndianRupee className="w-5 h-5" />
                  <span className="font-medium">Pay Per Message</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="group flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-green-500/25 transition-all"
                >
                  Start Free - No Card Required
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="flex items-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-green-500 hover:text-green-600 transition-all"
                >
                  View Pricing
                </a>
              </div>
            </motion.div>
          </div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-3xl p-4 md:p-8">
              <div className="bg-white rounded-2xl shadow-2xl shadow-green-500/10 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-4 text-sm text-gray-500">dashboard.akashvanni.com</span>
                </div>
                {/* Dashboard Mockup */}
                <div className="p-6 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Stats Cards */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Balance</span>
                        <IndianRupee className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">2,450.00</div>
                      <div className="text-xs text-green-600 mt-1">Ready to send</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Messages Sent</span>
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">12,847</div>
                      <div className="text-xs text-blue-600 mt-1">This month</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">Delivery Rate</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">99.2%</div>
                      <div className="text-xs text-emerald-600 mt-1">Excellent</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-sm">AI Messages</span>
                        <Bot className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">8,523</div>
                      <div className="text-xs text-purple-600 mt-1">AI generated</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Recent Messages</h4>
                    <div className="space-y-3">
                      {[
                        { phone: '+91 98765***21', status: 'delivered', time: '2 min ago', ai: true },
                        { phone: '+91 87654***32', status: 'read', time: '5 min ago', ai: true },
                        { phone: '+91 76543***43', status: 'delivered', time: '8 min ago', ai: false },
                      ].map((msg, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{msg.phone}</div>
                              <div className="text-xs text-gray-500">{msg.time}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {msg.ai && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Bot className="w-3 h-3" /> AI
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              msg.status === 'read' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {msg.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-green-100">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USP Comparison Section */}
      <section id="compare" className="py-20 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Why Choose Akashvanni?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              No Monthly Fees.{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Ever.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Other platforms charge you monthly whether you send 10 messages or 10,000.
              We believe you should only pay for what you use.
            </p>
          </div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-4 px-6 text-gray-600 font-medium">Feature</th>
                  <th className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <img src="/site_logo.png" alt="Akashvanni" className="h-6" />
                      <span className="font-bold text-green-600">Akashvanni</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center text-gray-500 font-medium">Other Platforms</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((item, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="py-4 px-6 text-gray-800">{item.feature}</td>
                    <td className="py-4 px-6 text-center">
                      {item.us === true ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
                      ) : item.us === false ? (
                        <XCircle className="w-6 h-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-600">{item.us}</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {item.others === true ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
                      ) : item.others === false ? (
                        <XCircle className="w-6 h-6 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-400">{item.others}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Bottom Note */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Stop paying for subscriptions you don't fully use.{' '}
              <Link to="/register" className="text-green-600 font-semibold hover:underline">
                Switch to pay-per-message today
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need,{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                powered by AI
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Smart features designed to help you connect with customers and drive results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 relative"
              >
                {feature.badge && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {feature.badge}
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  feature.badge ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                }`}>
                  <feature.icon className={`w-6 h-6 ${feature.badge ? 'text-purple-600' : 'text-green-600'}`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get started in{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                3 simple steps
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for free. No credit card required to start.' },
              { step: '2', title: 'Add Balance', desc: 'Add money to your wallet. Pay only for messages you send.' },
              { step: '3', title: 'Send AI Messages', desc: 'Let AI create personalized messages and send in bulk.' }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-green-200 to-transparent"></div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              {/* Zero Monthly Fee Banner */}
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-full text-lg font-bold mb-6 shadow-lg shadow-green-500/30">
                <Sparkles className="w-6 h-6" />
                ₹0 MONTHLY FEE - FOREVER!
                <Sparkles className="w-6 h-6" />
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                India's Most{' '}
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Affordable
                </span>
                {' '}WhatsApp API
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
                No hidden charges. No monthly subscriptions. Just pure pay-per-message pricing.
                <br />
                <span className="font-semibold text-green-600">The more you send, the less you pay!</span>
              </p>

              {/* USP Badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Zero Setup Fee
                </div>
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Zero Monthly Fee
                </div>
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  Volume Discounts
                </div>
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  GST Invoice
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pricing Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="font-semibold text-lg">Monthly Volume</div>
                  <div className="font-semibold text-lg">Marketing Message</div>
                  <div className="font-semibold text-lg">Utility Message</div>
                </div>
              </div>

              {/* Pricing Tiers */}
              <div className="divide-y divide-gray-100">
                {/* Tier 1 - Starter */}
                <div className="grid grid-cols-3 gap-4 p-6 items-center hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <span className="text-gray-600 font-medium">Up to 2,499</span>
                    <p className="text-xs text-gray-400">messages/month</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-gray-900">₹2.00</span>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-gray-900">₹1.00</span>
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="grid grid-cols-3 gap-4 p-6 items-center hover:bg-green-50 transition-colors bg-green-50/50">
                  <div className="text-center">
                    <span className="text-gray-700 font-semibold">2,500 - 4,999</span>
                    <p className="text-xs text-green-600 font-medium">10% OFF</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-green-600">₹1.80</span>
                    <p className="text-xs text-gray-400 line-through">₹2.00</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-green-600">₹0.80</span>
                    <p className="text-xs text-gray-400 line-through">₹1.00</p>
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="grid grid-cols-3 gap-4 p-6 items-center hover:bg-green-50 transition-colors">
                  <div className="text-center">
                    <span className="text-gray-700 font-semibold">5,000 - 9,999</span>
                    <p className="text-xs text-green-600 font-medium">25% OFF</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-green-600">₹1.50</span>
                    <p className="text-xs text-gray-400 line-through">₹2.00</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-green-600">₹0.50</span>
                    <p className="text-xs text-gray-400 line-through">₹1.00</p>
                  </div>
                </div>

                {/* Tier 4 - Best Value */}
                <div className="grid grid-cols-3 gap-4 p-6 items-center bg-gradient-to-r from-green-100 to-emerald-100 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    🔥 BEST VALUE
                  </div>
                  <div className="text-center">
                    <span className="text-gray-900 font-bold text-lg">10,000+</span>
                    <p className="text-xs text-green-700 font-bold">UP TO 50% OFF!</p>
                  </div>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-green-700">₹1.00</span>
                    <p className="text-xs text-gray-500 line-through">₹2.00</p>
                  </div>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-green-700">₹0.25</span>
                    <p className="text-xs text-gray-500 line-through">₹1.00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Reset Note */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-6 py-3 rounded-full">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Pricing resets on 1st of every month - Your savings start fresh!</span>
              </div>
            </div>

            {/* Features included */}
            <div className="mt-10 bg-gray-50 rounded-2xl p-8">
              <h3 className="text-center text-xl font-bold text-gray-900 mb-6">Everything Included in Every Message</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { icon: Bot, text: 'AI-Powered Messages' },
                  { icon: Shield, text: 'Enterprise Security' },
                  { icon: BarChart3, text: 'Real-time Analytics' },
                  { icon: FileText, text: 'GST Compliant Invoice' },
                  { icon: Zap, text: 'Instant Delivery' },
                  { icon: Globe, text: 'API Access' },
                  { icon: Users, text: 'Unlimited Contacts' },
                  { icon: Clock, text: '24/7 Support' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-10 py-5 rounded-xl font-bold text-xl hover:shadow-2xl hover:shadow-green-500/30 transition-all"
              >
                Start Free - No Card Required
                <ArrowRight className="w-6 h-6" />
              </Link>
              <p className="mt-4 text-gray-500">
                Join 5000+ businesses saving money with Akashvanni
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                businesses everywhere
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Frequently Asked Questions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to know about{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                WhatsApp Automation
              </span>
            </h2>
            <p className="text-lg text-gray-600">
              Got questions? We've got answers. Here's what businesses ask us most.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                  <ChevronDown className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                  <p className="px-5 text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-500 mb-4">Still have questions?</p>
            <a
              href="https://wa.me/919643847397?text=Hi%20I%20have%20a%20question%20about%20WhatsApp%20automation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-6 py-3 rounded-full font-medium hover:bg-green-100 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to transform your customer communication?
          </h2>
          <p className="text-xl text-green-100 mb-4">
            Join thousands of businesses using Akashvanni's AI-powered platform.
          </p>
          <p className="text-green-200 mb-8">
            No monthly fees. No credit card required. Start free today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 bg-white text-green-600 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl transition-all"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="mailto:support@akashvanni.com"
              className="flex items-center gap-2 border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/site_logo.png" alt="Akashvanni" className="h-10 brightness-0 invert" />
                <span className="text-xl font-bold text-white">Akashvanni</span>
              </div>
              <p className="text-gray-400">
                AI-Powered WhatsApp Automation Platform. No monthly fees, just results.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} TWO ZERO. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
