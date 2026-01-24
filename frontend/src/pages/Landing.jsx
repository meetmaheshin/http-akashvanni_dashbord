import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  XCircle
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
              <a href="#testimonials" className="text-gray-600 hover:text-green-600 transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-green-600 transition-colors font-medium">
                Login
              </Link>
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
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <IndianRupee className="w-4 h-4" />
              Simple Pay-Per-Message Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              No subscriptions.{' '}
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                No monthly fees.
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Just pay for the messages you send. The more you send, the more you save.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Standard Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Standard</h3>
              <p className="text-gray-500 mb-6">Perfect for getting started</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">&#8377;2</span>
                <span className="text-gray-500 ml-2">per message</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'AI-powered message generation',
                  'Template & session messages',
                  'Real-time delivery tracking',
                  'GST compliant invoices',
                  'API access included',
                  'Email support'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl font-medium transition-all border border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600"
              >
                Get Started Free
              </Link>
            </motion.div>

            {/* Bulk Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="relative bg-white rounded-2xl p-8 border-2 border-green-500 shadow-xl shadow-green-500/10"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Best Value
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Bulk Volume</h3>
              <p className="text-gray-500 mb-6">For 2000+ messages per day</p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">&#8377;1.80</span>
                <span className="text-gray-500 ml-2">per message</span>
              </div>
              <div className="bg-green-50 rounded-lg p-3 mb-6">
                <p className="text-green-700 text-sm font-medium">
                  Save 25% when you send 1000+ messages daily!
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Standard',
                  'Bulk volume discount',
                  'Priority message delivery',
                  'Advanced analytics dashboard',
                  'Priority support',
                  'Dedicated account manager'
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl font-medium transition-all bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25"
              >
                Start Sending
              </Link>
            </motion.div>
          </div>

          {/* Pricing Note */}
          <div className="mt-12 text-center">
            <p className="text-gray-500">
              All prices are in INR and include GST. Bulk pricing is automatically applied when you reach 1000+ messages/day.
            </p>
          </div>
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
