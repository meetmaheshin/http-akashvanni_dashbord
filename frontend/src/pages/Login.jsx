import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader2, Mail, Lock, ArrowRight, Zap, Shield, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: 'Lightning Fast', desc: 'Send thousands of messages instantly' },
    { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security' },
    { icon: BarChart3, title: 'Analytics', desc: 'Track every message in real-time' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-green-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-300/10 rounded-full blur-[150px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img src="/site_logo.png" alt="Akashvanni" className="h-12" />
            <span className="text-2xl font-bold text-gray-800 tracking-tight">Akashvanni</span>
          </div>

          {/* Hero text */}
          <h1 className="text-5xl xl:text-6xl font-bold text-gray-800 leading-tight mb-6">
            Automate Your
            <span className="block bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              WhatsApp Business
            </span>
          </h1>

          <p className="text-lg text-gray-600 mb-12 max-w-lg">
            Send bulk messages, automate responses, and track engagement with our
            powerful WhatsApp automation platform.
          </p>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-gray-800 font-semibold">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-3xl blur-lg opacity-20" />

              {/* Card content */}
              <div className="relative bg-white/80 backdrop-blur-2xl border border-gray-200 rounded-3xl p-8 lg:p-10 shadow-2xl">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
                  <img src="/site_logo.png" alt="Akashvanni" className="h-10" />
                  <span className="text-xl font-bold text-gray-800">Akashvanni</span>
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Welcome back</h2>
                  <p className="text-gray-500">Sign in to your account to continue</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email field */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${
                      focusedField === 'email' ? 'ring-2 ring-green-500/50' : ''
                    }`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className={`w-5 h-5 transition-colors ${
                          focusedField === 'email' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@company.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${
                      focusedField === 'password' ? 'ring-2 ring-green-500/50' : ''
                    }`}>
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`w-5 h-5 transition-colors ${
                          focusedField === 'password' ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Enter your password"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Forgot password link */}
                  <div className="flex justify-end">
                    <button type="button" className="text-sm text-green-600 hover:text-green-700 transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full relative group"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300" />
                    <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-semibold">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">New to Akashvanni?</span>
                  </div>
                </div>

                {/* Sign up link */}
                <Link
                  to="/register"
                  className="block w-full text-center py-3.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Create an account
                </Link>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-gray-500 text-sm mt-8">
              By signing in, you agree to our{' '}
              <a href="#" className="text-green-600 hover:underline">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-green-600 hover:underline">Privacy Policy</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
